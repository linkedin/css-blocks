import * as config from "@css-blocks/config";
import { AnalysisOptions, Block, BlockCompiler, BlockDefinitionCompiler, BlockFactory, Configuration, INLINE_DEFINITION_FILE, NodeJsImporter, Options as ParserOptions, OutputMode, resolveConfiguration } from "@css-blocks/core";
import type { ASTPlugin, ASTPluginEnvironment } from "@glimmer/syntax";
import { MultiMap, ObjectDictionary } from "@opticss/util";
import BroccoliDebug = require("broccoli-debug");
import funnel = require("broccoli-funnel");
import type { InputNode } from "broccoli-node-api";
import outputWrapper = require("broccoli-output-wrapper");
import md5Sum = require("broccoli-persistent-filter/lib/md5-hex");
import persistentStrategy = require("broccoli-persistent-filter/lib/strategies/persistent");
import debugGenerator from "debug";
import TemplateCompilerPlugin = require("ember-cli-htmlbars/lib/template-compiler-plugin");
import type EmberApp from "ember-cli/lib/broccoli/ember-app";
import type EmberAddon from "ember-cli/lib/models/addon";
import type { AddonImplementation, ThisAddon, Tree } from "ember-cli/lib/models/addon";
import type Project from "ember-cli/lib/models/project";
import FSMerger = require("fs-merger");
import * as FSTree from "fs-tree-diff";
import { OptiCSSOptions, postcss } from "opticss";
import * as path from "path";

import { AnalyzingRewriteManager } from "./AnalyzingRewriteManager";
import { BroccoliFileLocator } from "./BroccoliFileLocator";
import { BroccoliTreeImporter, identToPath, isBroccoliTreeIdentifier } from "./BroccoliTreeImporter";
import { EmberAnalysis } from "./EmberAnalysis";
import { ASTPluginWithDeps } from "./TemplateAnalyzingRewriter";

const debug = debugGenerator("css-blocks:ember");
type PersistentStrategy = typeof persistentStrategy;
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

interface AdditionalFile {
  outputPath: string;
  contents: string;
}

const BLOCK_GLOB = "**/*.block.{css,scss,sass,less,styl}";
interface EmberASTPluginEnvironment extends ASTPluginEnvironment {
  meta?: {
    moduleName?: string;
  };
}

function withoutCssBlockFiles(tree: InputNode | undefined) {
  if (!tree) return tree;
  return funnel(tree, {
    exclude: [
      "**/*.block.{css,scss,sass,less,styl}",
    ],
  });
}

class CSSBlocksTemplateCompilerPlugin extends TemplateCompilerPlugin {
  previousSourceTree: FSTree;
  cssBlocksOptions: CSSBlocksEmberOptions;
  parserOpts: Readonly<Configuration>;
  analyzingRewriter: AnalyzingRewriteManager | undefined;
  input!: FSMerger.FS;
  output!: outputWrapper.FSOutput;
  persist: boolean;
  treeName: string;
  constructor(inputTree: InputNode, treeName: string, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions, cssBlocksOptions: CSSBlocksEmberOptions) {
    super(inputTree, htmlbarsOptions);
    this.cssBlocksOptions = cssBlocksOptions;
    this.parserOpts = resolveConfiguration(cssBlocksOptions.parserOpts);
    this.previousSourceTree = new FSTree();
    this.treeName = treeName;
    let persist = htmlbarsOptions.persist;
    if (persist === undefined) persist = true;
    this.persist = TemplateCompilerPlugin.shouldPersist(process.env, persist);
  }
  astPluginBuilder(env: EmberASTPluginEnvironment): ASTPluginWithDeps {
    let moduleName = env.meta?.["moduleName"];
    if (!moduleName) {
      debug("No module name. Returning noop ast plugin");
      return {
        name: "css-blocks-noop",
        visitor: {},
      };
    }
    debug(`Returning template analyzer and rewriter for ${moduleName}`);
    if (!this.analyzingRewriter) {
      throw new Error("[internal error] analyzing rewriter expected.");
    }
    // The analyzing rewriter gets swapped out at the beginning of build() with
    // a new instance. that instance tracks all the analyses that are produced
    // for each ast plugin that is created for each template once super.build()
    // is done, the analyses for all of the templates is complete and we can
    // write additional output files to the output tree.
    return this.analyzingRewriter.templateAnalyzerAndRewriter(moduleName, env.syntax);
  }

  async build() {
    let cssBlockEntries = this.input.entries(".", {globs: [BLOCK_GLOB]});
    let currentFSTree = FSTree.fromEntries(cssBlockEntries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    let removedFiles = patch.filter((change) => change[0] === "unlink");
    this.previousSourceTree = currentFSTree;
    if (removedFiles.length > 0) {
      console.warn(`[WARN] ${removedFiles[0][1]} was just removed and the output directory was not cleaned up.`);
    }
    let importer = new BroccoliTreeImporter(this.input, this.parserOpts.importer);
    let config = resolveConfiguration({importer}, this.parserOpts);
    let factory = new BlockFactory(config, postcss);
    let fileLocator = new BroccoliFileLocator(this.input);
    debug(`Looking for templates using css blocks.`);
    this.analyzingRewriter = new AnalyzingRewriteManager(factory, fileLocator, this.cssBlocksOptions.analysisOpts || {}, this.parserOpts);
    // The astPluginBuilder interface isn't async so we have to first load all
    // the blocks and associate them to their corresponding templates.
    await this.analyzingRewriter.discoverTemplatesWithBlocks();
    debug(`Discovered ${Object.keys(this.analyzingRewriter.templateBlocks).length} templates with corresponding block files.`);
    // Compiles the handlebars files, runs our plugin for each file
    // we have to wrap this RSVP Promise that's returned in a native promise or
    // else await won't work.
    let builder = new Promise((resolve, reject) => {
      try {
        let buildResult = super.build() || Promise.resolve();
        buildResult.then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    });
    await builder;
    debug(`Template rewriting complete.`);
    // output compiled block files and template analyses
    let blocks = new Set<Block>();
    let blockOutputPaths = new Map<Block, string>();
    let analyses = new Array<EmberAnalysis>();
    let templateBlocks = new MultiMap<EmberAnalysis, Block>();
    for (let analyzedTemplate of this.analyzingRewriter.analyzedTemplates()) {
      let { block, analysis } = analyzedTemplate;
      analyses.push(analysis);
      blocks.add(block);
      templateBlocks.set(analysis, block);
      let blockDependencies = block.transitiveBlockDependencies();
      templateBlocks.set(analysis, ...blockDependencies);
      for (let depBlock of blockDependencies) {
        blocks.add(depBlock);
      }
    }
    debug(`Analyzed ${analyses.length} templates.`);
    debug(`Discovered ${blocks.size} blocks in use.`);
    let additionalFileCacheKeys = new MultiMap<EmberAnalysis, string>();
    let compiler = new BlockCompiler(postcss, this.parserOpts);
    compiler.setDefinitionCompiler(new BlockDefinitionCompiler(postcss, (_b, p) => { return p.replace(".block.css", ".compiledblock.css"); }, this.parserOpts));
    for (let block of blocks) {
      debug(`compiling: ${config.importer.debugIdentifier(block.identifier, config)}`);
      let outputPath = getOutputPath(block);
      // Skip processing if we don't get an output path. This happens for files that
      // get referenced in @block from node_modules.
      if (outputPath === null) {
        continue;
      }
      blockOutputPaths.set(block, outputPath);
      if (!block.stylesheet) {
        throw new Error("[internal error] block stylesheet expected.");
      }
      // TODO - allow for inline definitions or files, by user option
      let { css: compiledAST } = compiler.compileWithDefinition(block, block.stylesheet, this.analyzingRewriter.reservedClassNames(), INLINE_DEFINITION_FILE);
      // TODO disable source maps in production?
      let result = compiledAST.toResult({ to: outputPath, map: { inline: true } });
      let contents = result.css;
      if (this.persist) {
        // We only compile and output each block once, but a block might be consumed
        // by several of the templates that we have processed. So we have to figure out
        // which template(s) depend on the block we're writing.
        for (let {analysis} of this.analyzingRewriter.analyzedTemplates()) {
          if (templateBlocks.hasValue(analysis, block)) {
            await this.cacheAdditionalFile(additionalFileCacheKeys, analysis, {outputPath, contents});
          }
        }
      }
      this.output.writeFileSync(outputPath, contents, "utf8");
      debug(`compiled: ${outputPath}`);
    }
    for (let analysis of analyses) {
      let outputPath = analysisPath(analysis.template.relativePath);
      let contents = JSON.stringify(analysis.serialize(blockOutputPaths));
      await this.cacheAdditionalFile(additionalFileCacheKeys, analysis, {outputPath, contents});
      this.output.mkdirSync(path.dirname(outputPath), { recursive: true });
      this.output.writeFileSync(
        outputPath,
        contents,
        "utf8",
      );
      debug(`Analyzed ${analysis.template.relativePath} => ${outputPath}`);
    }
    if (this.persist) {
      for (let analysis of additionalFileCacheKeys.keys()) {
        let cacheKey = this.additionalFilesCacheKey(this.inputFileCacheKey(analysis.template.relativePath));
        let additionalCacheKeys = additionalFileCacheKeys.get(analysis);
        await (<PersistentStrategy>this.processor.processor)._cache?.set(cacheKey, JSON.stringify(additionalCacheKeys));
        debug(`Stored ${additionalCacheKeys.length} additional output files for ${analysis.template.relativePath} to cache.`);
        debug(`Cache keys are: ${additionalCacheKeys.join(", ")}`);
      }
    }
  }
  inputFileCacheKey(relativePath): string {
    // it would be nice if we could avoid this double read.
    let contents = this.input.readFileSync(relativePath, this.inputEncoding || "utf8");
    return this.cacheKeyProcessString(contents, relativePath);
  }
  additionalFilesCacheKey(mainFileCacheKey: string): string {
    return `${mainFileCacheKey}-additional-files`;
  }
  async cacheAdditionalFile(additionalFileCacheKeys: MultiMap<EmberAnalysis, string>, analysis: EmberAnalysis, additionalFile: AdditionalFile) {
    if (this.persist) {
      let cacheKey = md5Sum([additionalFile.outputPath, additionalFile.contents]);
      additionalFileCacheKeys.set(analysis, cacheKey);
      await (<PersistentStrategy>this.processor.processor)._cache!.set(cacheKey, JSON.stringify(additionalFile));
      debug(`Wrote cache key ${cacheKey} for ${additionalFile.outputPath}`);
    }
  }
  // We override broccoli-persistent-filter's _handleFile implementation
  // in order to extract the additional output files from cache when the file is cached.
  async _handleFile(relativePath: string, srcDir: string, destDir: string, entry: Parameters<TemplateCompilerPlugin["_handleFile"]>[3], outputPath: string, forceInvalidation: boolean, isChange: boolean, stats: Parameters<TemplateCompilerPlugin["_handleFile"]>[7]) {
    let cached = false;
    let mainFileCacheKey: string | undefined;
    if (this.persist) {
      mainFileCacheKey = this.inputFileCacheKey(relativePath);
      let result = await (<PersistentStrategy>this.processor.processor)._cache!.get(mainFileCacheKey);
      cached = result.isCached;
    }
    let result = await super._handleFile(relativePath, srcDir, destDir, entry, outputPath, forceInvalidation, isChange, stats);
    if (cached && !forceInvalidation) {
      // first we read out the list of additional cache keys for other output files.
      let additionalFilesCacheKey = this.additionalFilesCacheKey(mainFileCacheKey!);
      let cacheKeysCacheResult = await (<PersistentStrategy>this.processor.processor)._cache!.get<string>(additionalFilesCacheKey);
      if (cacheKeysCacheResult.isCached) {
        let additionalCacheKeys: Array<string> = JSON.parse(cacheKeysCacheResult.value);
        // for each cache key we read out the additional file metadata that is cached and write the additional file to the output tree.
        for (let cacheKey of additionalCacheKeys) {
          let additionalFileCacheResult = await (<PersistentStrategy>this.processor.processor)._cache!.get<string>(cacheKey);
          if (!additionalFileCacheResult.isCached) throw new Error(`[css-blocks][${this.treeName}] Corrupt cache encountered while reading additional output files. Not found: ${cacheKey}`);
          let additionalFile: AdditionalFile = JSON.parse(additionalFileCacheResult.value);
          this.output.mkdirSync(path.dirname(additionalFile.outputPath), { recursive: true });
          this.output.writeFileSync(additionalFile.outputPath, additionalFile.contents, this.outputEncoding || "utf8");
        }
        debug(`Wrote ${additionalCacheKeys.length} additional cached files for ${relativePath}`);
      } else {
        // this happens when the file isn't a css-blocks based template.
        debug(`No additional cached files for ${relativePath}`);
      }
    }
    return result;
  }
}

function analysisPath(templatePath: string): string {
  let analysisPath = path.parse(templatePath);
  delete analysisPath.base;
  analysisPath.ext = ".block-analysis.json";
  return path.format(analysisPath);
}

function getOutputPath(block: Block): string | null {
  if (isBroccoliTreeIdentifier(block.identifier)) {
    return identToPath(block.identifier).replace(".block", ".compiledblock");
  } else {
    return null;
  }
}

/**
 * The options that can be passed for css blocks to an ember-cli application.
 */
export interface CSSBlocksEmberAppOptions {
  "css-blocks"?: CSSBlocksEmberOptions;
}

export interface CSSBlocksEmberOptions {
  output?: string;
  aliases?: ObjectDictionary<string>;
  analysisOpts?: AnalysisOptions;
  parserOpts?: Writeable<ParserOptions>;
  optimization?: Partial<OptiCSSOptions>;
}

interface CSSBlocksAddon {
  templateCompiler?: CSSBlocksTemplateCompilerPlugin;
  findSiblingAddon<AddonType>(this: ThisAddon<CSSBlocksAddon>, name: string): ThisAddon<AddonType> | undefined;
  getOptions(this: ThisAddon<CSSBlocksAddon>): CSSBlocksEmberOptions;
  optionsForCacheInvalidation(this: ThisAddon<CSSBlocksAddon>): ObjectDictionary<unknown>;
  astPluginBuilder(env: EmberASTPluginEnvironment): ASTPlugin;
  _options?: CSSBlocksEmberOptions;
}
interface HTMLBarsAddon {
  transpileTree(inputTree: Tree, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions): TemplateCompilerPlugin;
}

function isAddon(parent: EmberAddon | EmberApp | Project): parent is EmberAddon {
  return !!parent["findOwnAddonByName"];
}

const EMBER_ADDON: AddonImplementation<CSSBlocksAddon> = {
  name: "@css-blocks/ember",

  init(parent, project) {
    this._super.init.call(this, parent, project);
    this.treePaths.app = "../runtime/app";
    this.treePaths.addon = "../runtime/addon";
  },

  findSiblingAddon(name) {
    if (isAddon(this.parent)) {
      return this.parent.findOwnAddonByName(name);
    } else {
      return this.project.findAddonByName(name);
    }
  },

  included(parent) {
    this._super.included.apply(this, [parent]);
    this.app = this._findHost();
    let parentName = typeof parent.name === "string" ? parent.name : parent.name();
    debug(`@css-blocks/ember included into ${parentName}`);
    this._options = this.getOptions();
    let htmlBarsAddon = this.findSiblingAddon<HTMLBarsAddon>("ember-cli-htmlbars");
    if (!htmlBarsAddon) {
      throw new Error(`Using @css-blocks/ember on ${parentName} also requires ember-cli-htmlbars to be an addon for ${parentName} (ember-cli-htmlbars should be a dependency in package.json, not a devDependency)`);
    }
    if (!htmlBarsAddon.transpileTree) {
      throw new Error(`Version ${htmlBarsAddon.pkg.version} of ember-cli-htmlbars for ${parentName} is not compatible with @css-blocks/ember. Please upgrade to ^5.2.0.`);
    }
    htmlBarsAddon.transpileTree = (inputTree: Tree, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions) => {
      debug(`transpileTree for ${parentName} was called.`);
      this.templateCompiler = new CSSBlocksTemplateCompilerPlugin(inputTree, parentName, htmlbarsOptions, this._options!);
      return this.templateCompiler;
    };
  },

  astPluginBuilder(env) {
    return this.templateCompiler!.astPluginBuilder(env);
  },

  preprocessTree(type, tree) {
    if (type !== "css") return tree;
    // We compile CSS Block files in the template tree, so in the CSS Tree all
    // we need to do is prune them out of the build before the tree gets
    // built.
    return withoutCssBlockFiles(tree);
  },

  postprocessTree(type, tree) {
    if (type !== "template") return tree;
    tree = withoutCssBlockFiles(tree);
    let parentName = typeof this.parent.name === "string" ? this.parent.name : this.parent.name();
    let isAddon = typeof this.parent.name === "string";
    return new BroccoliDebug(tree, `css-blocks:template-output:${parentName}:${isAddon ? "addon" : "app"}`);
  },

  setupPreprocessorRegistry(type, registry) {
    if (type !== "parent") { return; }
    // For Ember
    registry.add("htmlbars-ast-plugin", {
      name: "css-blocks-htmlbars",
      // TODO: parallel babel stuff
      plugin: this.astPluginBuilder.bind(this),
      // This is turned off to work around a bug in broccoli-persistent-filter.
      dependencyInvalidation: false,
      cacheKey: () => this.optionsForCacheInvalidation(),
      baseDir: () => __dirname,
    });
  },

  getOptions() {
    let app = this.app!;
    let root = app.project.root;
    let appOptions = app.options;

    if (!appOptions["css-blocks"]) {
      appOptions["css-blocks"] = {};
    }

    // Get CSS Blocks options provided by the application, if present.
    const options = <CSSBlocksEmberOptions>appOptions["css-blocks"]; // Do not clone! Contains non-json-safe data.
    if (!options.aliases) options.aliases = {};
    if (!options.analysisOpts) options.analysisOpts = {};
    if (!options.optimization) options.optimization = {};

    if (!options.parserOpts) {
      options.parserOpts = config.searchSync(root) || {};
    }

    // Use the node importer by default.
    options.parserOpts.importer = options.parserOpts.importer || new NodeJsImporter(options.aliases);

    // Optimization is always disabled for now, until we get project-wide analysis working.
    if (typeof options.optimization.enabled === "undefined") {
      options.optimization.enabled = app.isProduction;
    }

    // Update parserOpts to include the absolute path to our application code directory.
    if (!options.parserOpts.rootDir) {
      options.parserOpts.rootDir = root;
    }
    options.parserOpts.outputMode = OutputMode.BEM_UNIQUE;

    if (options.output !== undefined && typeof options.output !== "string") {
      throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Output must be a string. Instead received ${options.output}.`);
    }
    return options;
  },

  optionsForCacheInvalidation() {
    let aliases = this._options!.aliases;
    let analysisOpts = this._options!.analysisOpts;
    let optimization = this._options!.optimization;
    let parserOpts: Writeable<ParserOptions> & {importerName?: string} = {};
    Object.assign(parserOpts, this._options!.parserOpts);
    let constructor = parserOpts.importer && parserOpts.importer.constructor;
    parserOpts.importerName = constructor && constructor.name;

    return {
      aliases,
      analysisOpts,
      optimization,
      parserOpts,
    };
  },
};

module.exports = EMBER_ADDON;
