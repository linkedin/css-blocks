import { Block, BlockCompiler, BlockFactory, SerializedSourceAnalysis, resolveConfiguration } from "@css-blocks/core";
import { BroccoliTreeImporter, EmberAnalysis, EmberAnalyzer, ResolvedCSSBlocksEmberOptions, TEMPLATE_TYPE, pathToIdent } from "@css-blocks/ember-utils";
import { unionInto } from "@opticss/util";
import mergeTrees = require("broccoli-merge-trees");
import type { InputNode } from "broccoli-node-api";
import Filter = require("broccoli-persistent-filter");
import Plugin = require("broccoli-plugin");
import type { PluginOptions } from "broccoli-plugin/dist/interfaces";
import debugGenerator from "debug";
import * as FSTree from "fs-tree-diff";
import { OptiCSSOptions, Optimizer, parseSelector, postcss } from "opticss";
import * as path from "path";

import { RuntimeDataGenerator } from "./RuntimeDataGenerator";
import { cssBlocksPostprocessFilename, cssBlocksPreprocessFilename, optimizedStylesPostprocessFilepath, optimizedStylesPreprocessFilepath } from "./utils/filepaths";
import { AddonEnvironment } from "./utils/interfaces";
import { AggregateRewriteData } from "./AggregateRewriteData";

const debug = debugGenerator("css-blocks:ember-app");

export class CSSBlocksApplicationPlugin extends Filter {
  appName: string;
  previousSourceTree: FSTree;
  cssBlocksOptions: ResolvedCSSBlocksEmberOptions;
  firstBuild: boolean;
  constructor(appName: string, inputNodes: InputNode[], cssBlocksOptions: ResolvedCSSBlocksEmberOptions, options?: PluginOptions) {
    super(mergeTrees(inputNodes), options || {});
    this.appName = appName;
    this.previousSourceTree = new FSTree();
    this.cssBlocksOptions = cssBlocksOptions;
    this.firstBuild = true;
  }
  processString(contents: string, _relativePath: string): string {
    return contents;
  }
  async build() {
    await super.build();
    let entries = this.input.entries(".", {globs: ["**/*.{compiledblock.css,block-analysis.json}"]});
    let currentFSTree = FSTree.fromEntries(entries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    if (patch.length === 0) {
      if (this.firstBuild) {
        this.firstBuild = false;
        // There's no blocks yet.
        // We need to produce an empty file to avoid causing errors at runtime.
        let data: AggregateRewriteData = {
          blockIds: {},
          blocks: [],
          outputClassnames: [],
          styleRequirements: {},
          impliedStyles: {},
          optimizations: [],
        };
        let serializedData = JSON.stringify(data, undefined, "  ");
        this.output.writeFileSync(
          `${this.appName}/services/-css-blocks-data.js`,
          "// CSS Blocks Generated Data. DO NOT EDIT\n" +
          `export const data = ${serializedData};\n`,
        );
      } else {
        // nothing changed from the last build.
      }
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }
    this.firstBuild = false;
    let config = resolveConfiguration(this.cssBlocksOptions.parserOpts);
    let importer = new BroccoliTreeImporter(this.input, null, config.importer);
    config = resolveConfiguration({importer}, config);
    let factory = new BlockFactory(config, postcss);
    let analyzer = new EmberAnalyzer(factory, this.cssBlocksOptions.analysisOpts);
    let optimizerOptions = this.cssBlocksOptions.optimization;
    this.reserveClassnames(optimizerOptions, this.cssBlocksOptions.appClasses);
    let optimizer = new Optimizer(optimizerOptions, analyzer.optimizationOptions);
    let blocksUsed = new Set<Block>();
    for (let entry of entries) {
      if (entry.relativePath.endsWith(".block-analysis.json")) {
        debug(`Processing analysis: ${entry.relativePath}`);
        let serializedAnalysis: SerializedSourceAnalysis<TEMPLATE_TYPE> = JSON.parse(this.input.readFileSync(entry.relativePath, "utf8"));
        debug("blocks", serializedAnalysis.stylesFound);
        for (let blockId of Object.keys(serializedAnalysis.blocks)) {
          serializedAnalysis.blocks[blockId] = pathToIdent(serializedAnalysis.blocks[blockId]);
        }
        let analysis = await EmberAnalysis.deserializeSource(serializedAnalysis, factory, analyzer);
        unionInto(blocksUsed, analysis.transitiveBlockDependencies());
        optimizer.addAnalysis(analysis.forOptimizer(config));
      }
    }
    let compiler = new BlockCompiler(postcss, config);
    let reservedClassnames = analyzer.reservedClassNames();
    for (let block of blocksUsed) {
      let content: postcss.Result | string;
      let filename = importer.debugIdentifier(block.identifier, config);
      if (block.precompiledStylesheetUnedited) {
        // We don't need to do any processing on the compiled css content, just
        // add it to the output.
        debug(`Looking up unedited Compiled CSS content for ${filename}`);
        content = block.precompiledStylesheetUnedited;
      } else {
        debug(`Compiling stylesheet for optimization of ${filename}`);
        // XXX Do we need to worry about reservedClassnames here?
        content = compiler.compile(block, block.stylesheet!, reservedClassnames).toResult();
      }
      optimizer.addSource({
        content,
        filename,
      });
    }
    debug(`Loaded ${blocksUsed.size} blocks.`);
    debug(`Loaded ${optimizer.analyses.length} analyses.`);
    let cssFileName = cssBlocksPreprocessFilename(this.cssBlocksOptions);
    let optLogFileName = `${cssFileName}.optimization.log`;
    let optimizationResult = await optimizer.optimize(cssFileName);
    debug(`Optimized CSS. There were ${optimizationResult.actions.performed.length} optimizations performed.`);

    // Embed the sourcemap into the final css output
    const finalizedCss = addSourcemapInfoToOptimizedCss(optimizationResult.output.content.toString(), optimizationResult.output.sourceMap?.toString());

    this.output.mkdirSync(path.dirname(cssFileName), {recursive: true});
    this.output.writeFileSync(cssFileName, finalizedCss, "utf8");
    this.output.writeFileSync(optLogFileName, optimizationResult.actions.logStrings().join("\n"), "utf8");
    debug("Wrote css, sourcemap, and optimization log.");

    // Also, write out a list of generated classes that we can use later
    // for conflict detection during postprocess.
    const classesUsed: Set<string> = new Set();
    optimizationResult.styleMapping.optimizedAttributes.forEach(attr => {
      classesUsed.add(attr.value.valueOf());
    });
    this.output.writeFileSync(
      optimizedStylesPreprocessFilepath,
      JSON.stringify(
        new Array(...classesUsed.values()),
        undefined,
        " ",
      ),
    );
    debug("Wrote list of generated classes.");

    let dataGenerator = new RuntimeDataGenerator([...blocksUsed], optimizationResult.styleMapping, analyzer, config, reservedClassnames);
    let data = dataGenerator.generate();
    let serializedData = JSON.stringify(data, undefined, "  ");
    debug("CSS Blocks Data is: \n%s", serializedData);

    this.output.mkdirSync(`${this.appName}/services`, {recursive: true});
    this.output.writeFileSync(
      `${this.appName}/services/-css-blocks-data.js`,
      `// CSS Blocks Generated Data. DO NOT EDIT.
       export const data = ${serializedData};
      `);
  }

  /**
   * Modifies the options passed in to supply the CSS classnames used in the
   * application to the the list of identifiers that should be omitted by the
   * classname generator.
   */
  reserveClassnames(optimizerOptions: Partial<OptiCSSOptions>, appClassesAlias: string[]): void {
    let rewriteIdents = optimizerOptions.rewriteIdents;
    let rewriteIdentsFlag: boolean;
    let omitIdents: Array<string>;
    if (typeof rewriteIdents === "boolean") {
      rewriteIdentsFlag = rewriteIdents;
      omitIdents = [];
    } else if (typeof rewriteIdents === "undefined") {
      rewriteIdentsFlag = true;
      omitIdents = [];
    } else {
      rewriteIdentsFlag = rewriteIdents.class;
      omitIdents = rewriteIdents.omitIdents && rewriteIdents.omitIdents.class || [];
    }

    // Add in any additional classes that were passed in using the appClasses alias.
    omitIdents.push(...appClassesAlias);

    optimizerOptions.rewriteIdents = {
      id: false,
      class: rewriteIdentsFlag,
      omitIdents: {
        class: omitIdents,
      },
    };
  }
}

/**
 * A plugin that is used during the CSS preprocess step to merge in the CSS Blocks optimized content
 * with application styles and the existing css tree.
 *
 * This plugin expects two broccoli nodes, in the following order...
 * 1) The result of the CSSBlocksApplicationPlugin.
 * 2) The css tree, passed in to `preprocessTree()`.
 *
 * This plugin will add the compiled CSS content created by the CSSBlocksApplicationPlugin and place
 * it into the CSS tree at the preferred location.
 */
export class CSSBlocksStylesPreprocessorPlugin extends Plugin {
  appName: string;
  previousSourceTree: FSTree;
  cssBlocksOptions: ResolvedCSSBlocksEmberOptions;
  constructor(appName: string, cssBlocksOptions: ResolvedCSSBlocksEmberOptions, inputNodes: InputNode[]) {
    super(inputNodes, {persistentOutput: true});
    this.appName = appName;
    this.previousSourceTree = new FSTree();
    this.cssBlocksOptions = cssBlocksOptions;
  }
  async build() {
    let stylesheetPath = cssBlocksPreprocessFilename(this.cssBlocksOptions);

    // Are there any changes to make? If not, bail out early.
    let entries = this.input.entries(
      ".",
      {
        globs: [
          stylesheetPath,
          "app/styles/css-blocks-style-mapping.css",
        ],
      },
    );
    let currentFSTree = FSTree.fromEntries(entries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    if (patch.length === 0) {
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }

    // Read in the CSS Blocks compiled content that was created previously
    // from the template tree.
    let blocksFileContents: string;
    if (this.input.existsSync(stylesheetPath)) {
      blocksFileContents = this.input.readFileSync(stylesheetPath, { encoding: "utf8" });
    } else {
      // We always write the output file if this addon is installed, even if
      // there's no css-blocks files.
      blocksFileContents = "";
    }

    // Now, write out compiled content to its expected location in the CSS tree.
    // By default, this is app/styles/css-blocks.css.
    this.output.mkdirSync(path.dirname(stylesheetPath), { recursive: true });
    this.output.writeFileSync(stylesheetPath, blocksFileContents);

    // Also, forward along the JSON list of optimizer-generated class names.
    if (this.input.existsSync(optimizedStylesPreprocessFilepath)) {
      const dataContent = this.input.readFileSync(optimizedStylesPreprocessFilepath).toString("utf8");
      this.output.writeFileSync(optimizedStylesPreprocessFilepath, dataContent);
    }
  }
}

/**
 * Plugin for the CSS postprocess tree. This plugin scans for classes declared
 * in application CSS (outside of CSS Blocks) and checks if there are any
 * duplicates between the app code and the classes generated by the optimizer.
 *
 * This plugin is only run for builds where the optimizer is enabled.
 */
export class CSSBlocksStylesPostprocessorPlugin extends Filter {
  env: AddonEnvironment;
  previousSourceTree: FSTree;

  constructor(env: AddonEnvironment, inputNodes: InputNode[]) {
    super(mergeTrees(inputNodes), {});
    this.env = env;
    this.previousSourceTree = new FSTree();
  }

  processString(contents: string, _relativePath: string): string {
    return contents;
  }

  async build() {
    await super.build();

    const blocksCssFile = cssBlocksPostprocessFilename(this.env.config);
    let optimizerClasses: string[] = [];
    const appCss: { relPath: string; content: string }[] = [];
    const foundClasses: { relPath: string; className: string; loc?: postcss.NodeSource }[] = [];
    const errorLog: string[] = [];

    // Are there any changes to make? If not, bail out early.
    let entries = this.input.entries(
      ".",
      {
        globs: [
          "**/*.css",
          optimizedStylesPostprocessFilepath,
        ],
      },
    );
    let currentFSTree = FSTree.fromEntries(entries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    if (patch.length === 0) {
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }

    // Read in the list of classes generated by the optimizer.
    if (this.input.existsSync(optimizedStylesPostprocessFilepath)) {
      optimizerClasses = JSON.parse(this.input.readFileSync(optimizedStylesPostprocessFilepath).toString("utf8"));
    } else {
      // Welp, nothing to do if we don't have optimizer data.
      debug("Skipping conflict analysis because there is no optimizer data.");
      return;
    }

    // Look up all the application style content that's already present.
    const walkEntries = this.input.entries(undefined, {
      globs: ["**/*.css"],
    });
    walkEntries.forEach(entry => {
      if (entry.relativePath === blocksCssFile) return;
      try {
        appCss.push({
          relPath: entry.relativePath,
          content: this.input.readFileSync(entry.relativePath).toString("utf8"),
        });
      } catch (e) {
        // broccoli-concat will complain about this later. let's move on.
      }
    });
    debug("Done looking up app CSS.");

    // Now, read in each of these sources and note all classes found.
    appCss.forEach(css => {
      try {
        const parsed = postcss.parse(css.content);
        parsed.walkRules(rule => {
          const selectors = parseSelector(rule.selector);
          selectors.forEach(sel => {
            sel.eachSelectorNode(node => {
              if (node.type === "class") {
                foundClasses.push({
                  relPath: css.relPath,
                  className: node.value,
                  loc: rule.source,
                });
              }
            });
          });
        });
      } catch (e) {
        // Can't parse CSS? We'll skip it and add a warning to the log.
        errorLog.push(e.toString());
        debug(`Ran into an error when parsing CSS content for conflict analysis! Review the error log for details.`);
      }
    });
    debug("Done finding app classes.");

    // Find collisions between the app styles and optimizer styles.
    const collisions = foundClasses.filter(val => optimizerClasses.includes(val.className));
    debug("Done identifying collisions.");

    // Build a logfile for the output tree, for debugging.
    let logfile = "FOUND APP CLASSES:\n";
    foundClasses.forEach(curr => { logfile += `${curr.className} (in ${curr.relPath} - ${curr.loc?.start?.line}:${curr.loc?.start?.column})\n`; });
    logfile += "\nERRORS:\n";
    errorLog.forEach(err => { logfile += `${err}\n`; });
    this.output.writeFileSync("assets/app-classes.log", logfile);
    debug("Wrote log file to broccoli tree.");

    if (collisions.length > 0) {
      throw new Error(
        "Your application CSS contains classes that are also generated by the CSS optimizer. This can cause style conflicts between your application's classes and those generated by CSS Blocks.\n" +
        "To resolve this conflict, you should add any short class names in non-block CSS (~5 characters or less) to the list of disallowed classes in your build configuration.\n" +
        "(You can do this by setting css-blocks.appClasses to an array of disallowed classes in ember-cli-build.js.)\n\n" +
        "Conflicting classes:\n" +
        collisions.reduce((prev, curr) => prev += `${curr.className} (in ${curr.relPath} - ${curr.loc?.start?.line}:${curr.loc?.start?.column})\n`, ""),
      );
    }
  }
}

/**
 * Given CSS and a sourcemap, append an embedded sourcemap (base64 encoded)
 * to the end of the css.
 * @param css - The CSS content to be added to.
 * @param sourcemap - The sourcemap data to add.
 * @returns - The CSS with embedded sourcemap, or just the CSS if no sourcemap was given.
 */
function addSourcemapInfoToOptimizedCss(css: string, sourcemap?: string) {
  if (!sourcemap) {
    return css;
  }

  const encodedSourcemap = Buffer.from(sourcemap).toString("base64");
  return `${css}\n/*# sourceMappingURL=data:application/json;base64,${encodedSourcemap} */`;
}
