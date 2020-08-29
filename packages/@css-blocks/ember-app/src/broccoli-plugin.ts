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
import { OptiCSSOptions, Optimizer, postcss } from "opticss";
import * as path from "path";

import { RuntimeDataGenerator } from "./RuntimeDataGenerator";

const debug = debugGenerator("css-blocks:ember-app");

export class CSSBlocksApplicationPlugin extends Filter {
  appName: string;
  previousSourceTree: FSTree;
  cssBlocksOptions: ResolvedCSSBlocksEmberOptions;
  constructor(appName: string, inputNodes: InputNode[], cssBlocksOptions: ResolvedCSSBlocksEmberOptions, options?: PluginOptions) {
    super(mergeTrees(inputNodes), options || {});
    this.appName = appName;
    this.previousSourceTree = new FSTree();
    this.cssBlocksOptions = cssBlocksOptions;
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
      // nothing changed from the last build.
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }
    let config = resolveConfiguration(this.cssBlocksOptions.parserOpts);
    let importer = new BroccoliTreeImporter(this.input, null, config.importer);
    config = resolveConfiguration({importer}, config);
    let factory = new BlockFactory(config, postcss);
    let analyzer = new EmberAnalyzer(factory, this.cssBlocksOptions.analysisOpts);
    let optimizerOptions = this.cssBlocksOptions.optimization;
    this.reserveClassnames(optimizerOptions);
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
      let content: postcss.Result;
      let filename = importer.debugIdentifier(block.identifier, config);
      if (block.precompiledStylesheet) {
        debug(`Optimizing precompiled stylesheet for ${filename}`);
        content = block.precompiledStylesheet.toResult();
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
    let cssFileName = cssBlocksOutputFilename(this.cssBlocksOptions);
    let optLogFileName = `${cssFileName}.optimization.log`;
    let optimizationResult = await optimizer.optimize(cssFileName);
    debug(`Optimized CSS. There were ${optimizationResult.actions.performed.length} optimizations performed.`);

    // Embed the sourcemap into the final css output
    const finalizedCss = addSourcemapInfoToOptimizedCss(optimizationResult.output.content.toString(), optimizationResult.output.sourceMap?.toString());

    this.output.mkdirSync(path.dirname(cssFileName), {recursive: true});
    this.output.writeFileSync(cssFileName, finalizedCss, "utf8");
    this.output.writeFileSync(optLogFileName, optimizationResult.actions.logStrings().join("\n"), "utf8");
    debug("Wrote css, sourcemap, and optimization log.");

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
  reserveClassnames(optimizerOptions: Partial<OptiCSSOptions>): void {
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

    // TODO: scan css files for other classes in use and add them to `omitIdents`.

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
    // Are there any changes to make? If not, bail out early.
    let stylesheetPath = cssBlocksOutputFilename(this.cssBlocksOptions);
    let entries = this.input.entries(".", {globs: [stylesheetPath]});
    let currentFSTree = FSTree.fromEntries(entries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    if (patch.length === 0) {
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }
    // Read in the CSS Blocks compiled content that was created previously.
    let blocksFileContents: string;
    if (this.input.existsSync(stylesheetPath)) {
      blocksFileContents = this.input.readFileSync(stylesheetPath, { encoding: "utf8" });
    } else {
      // We always write the output file if this addon is installed, even if
      // there's no css-blocks files.
      blocksFileContents = "";
    }

    // Now, write out compiled content to its expected location.
    // By default, this is app/styles/css-blocks.css.
    this.output.mkdirSync(path.dirname(stylesheetPath), { recursive: true });
    this.output.writeFileSync(stylesheetPath, blocksFileContents);
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

/**
 * Generate the output path for the compiled CSS Blocks content, using the
 * preferred filename given by the user. If none is given, the default
 * path is "app/styles/css-blocks.css".
 * @param options - The options passed to the Ember plugin.
 * @returns - The path for the CSS Blocks compiled content.
 */
function cssBlocksOutputFilename(options: ResolvedCSSBlocksEmberOptions) {
  let outputName = options.output || "css-blocks.css";
  return `app/styles/${outputName}`;
}
