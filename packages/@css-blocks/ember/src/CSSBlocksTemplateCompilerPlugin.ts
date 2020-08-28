import { Block, BlockCompiler, BlockDefinitionCompiler, BlockFactory, Configuration, INLINE_DEFINITION_FILE, resolveConfiguration } from "@css-blocks/core";
import { BroccoliTreeImporter, CSSBlocksEmberOptions, EmberAnalysis, identToPath, isBroccoliTreeIdentifier } from "@css-blocks/ember-utils";
import type { ASTPluginEnvironment } from "@glimmer/syntax";
import { MultiMap } from "@opticss/util";
import type { InputNode } from "broccoli-node-api";
import outputWrapper = require("broccoli-output-wrapper");
import md5Sum = require("broccoli-persistent-filter/lib/md5-hex");
import persistentStrategy = require("broccoli-persistent-filter/lib/strategies/persistent");
import debugGenerator from "debug";
import TemplateCompilerPlugin = require("ember-cli-htmlbars/lib/template-compiler-plugin");
import FSMerger = require("fs-merger");
import type { FS as MergedFileSystem } from "fs-merger";
import * as FSTree from "fs-tree-diff";
import { postcss } from "opticss";
import * as path from "path";

import { AnalyzingRewriteManager } from "./AnalyzingRewriteManager";
import { BroccoliFileLocator } from "./BroccoliFileLocator";
import { ASTPluginWithDeps } from "./TemplateAnalyzingRewriter";

type PersistentStrategy = typeof persistentStrategy;

interface AdditionalFile {
  outputPath: string;
  contents: string;
}
export const BLOCK_GLOB = "**/*.block.{css,scss,sass,less,styl}";
export const COMPILED_BLOCK_GLOB = "**/*.compiledblock.css";

const debug = debugGenerator("css-blocks:ember");

export interface EmberASTPluginEnvironment extends ASTPluginEnvironment {
  meta?: {
    moduleName?: string;
  };
}

/**
 * This class extends ember-cli-htmlbars's template compiler (which is built on
 * top of broccoli-persistent-filter). In the ember-cli addon for this package
 * we monkey patch ember-cli-htmlbars' ember-cli addon to return an instance of
 * this class instead.
 *
 * The reason we must extend the template compiler is so that we can write
 * and manage the cache for the additional output files that are associated with
 * each template. We produce compiled css-blocks files for the parent as well
 * as template analysis metadata for each template.
 *
 * For each template that uses CSS Blocks we create a cache entry that contains
 * the cache keys for each additional file that is output with the template.
 * the cached data for each additional file includes the output path as well as
 * the contents for that file.
 *
 * Note: It is possible for several templates to depend on the same CSS Block
 * file and so their caches will point to the same additional file cache
 * entries. This produces a little extra work when the cache is warm but
 * ensures consistency if one of the templates is removed.
 *
 * In the case where just one of the templates is invalidated, the css block file
 * will get recompiled after it is retrieved from cache, but this is ok because
 * the output from css-blocks will be identical.
 */
export class CSSBlocksTemplateCompilerPlugin extends TemplateCompilerPlugin {
  previousSourceTree: FSTree;
  cssBlocksOptions: CSSBlocksEmberOptions;
  parserOpts: Readonly<Configuration>;
  analyzingRewriter: AnalyzingRewriteManager | undefined;
  input!: FSMerger.FS;
  output!: outputWrapper.FSOutput;
  persist: boolean;
  treeName: string;
  debug: debugGenerator.Debugger;
  isCssBlocksTemplateCompiler: true;
  constructor(inputTree: InputNode, treeName: string, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions, cssBlocksOptions: CSSBlocksEmberOptions) {
    super(inputTree, htmlbarsOptions);
    this.isCssBlocksTemplateCompiler = true;
    this.cssBlocksOptions = cssBlocksOptions;
    this.parserOpts = resolveConfiguration(cssBlocksOptions.parserOpts);
    this.previousSourceTree = new FSTree();
    this.treeName = treeName;
    let persist = htmlbarsOptions.persist;
    if (persist === undefined) persist = true;
    this.persist = TemplateCompilerPlugin.shouldPersist(process.env, persist);
    this.debug = debug.extend(treeName);
  }
  astPluginBuilder(env: EmberASTPluginEnvironment): ASTPluginWithDeps {
    let moduleName = env.meta?.["moduleName"];
    if (!moduleName) {
      this.debug("No module name. Returning noop ast plugin");
      return {
        name: "css-blocks-noop",
        visitor: {},
      };
    }
    this.debug(`Returning template analyzer and rewriter for ${moduleName}`);
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
    let namespace = md5Sum(this.treeName).slice(0, 3);
    let importer = new BroccoliTreeImporter(this.input, namespace, this.parserOpts.importer);
    let config = resolveConfiguration({importer}, this.parserOpts);
    let factory = new BlockFactory(config, postcss);
    let fileLocator = new BroccoliFileLocator(this.input);
    this.debug(`Looking for templates using css blocks.`);
    this.analyzingRewriter = new AnalyzingRewriteManager(factory, fileLocator, this.cssBlocksOptions.analysisOpts || {}, config);
    // The astPluginBuilder interface isn't async so we have to first load all
    // the blocks and associate them to their corresponding templates.
    await this.analyzingRewriter.discoverTemplatesWithBlocks();
    this.debug(`Discovered ${Object.keys(this.analyzingRewriter.templateBlocks).length} templates with corresponding block files.`);

    // Compiles the handlebars files, runs our plugin for each file
    // we have to wrap this RSVP Promise that's returned in a native promise or
    // else await won't work.
    await nativePromise(() => super.build());
    this.debug(`Template rewriting complete.`);

    let blocks = new Set<Block>(); // these blocks must be compiled
    let blockOutputPaths = new Map<Block, string>(); // this mapping is needed by the template analysis serializer.
    let analyses = new Array<EmberAnalysis>(); // Analyses to serialize.
    let templateBlocks = new MultiMap<EmberAnalysis, Block>(); // Tracks the blocks associated with each template (there's a 1-1 relationship beteen analyses and templates).
    let additionalFileCacheKeys = new MultiMap<EmberAnalysis, string>(); // tracks the cache keys we create for each additional output file.
    // first pass discovers the set of all blocks & associate them to their corresponding analyses.
    for (let analyzedTemplate of this.analyzingRewriter.analyzedTemplates()) {
      let { analysis } = analyzedTemplate;
      analyses.push(analysis);
      for (let block of analysis.transitiveBlockDependencies()) {
        blocks.add(block);
        templateBlocks.set(analysis, block);
      }
    }
    this.debug(`Analyzed ${analyses.length} templates.`);
    this.debug(`Discovered ${blocks.size} blocks in use.`);

    // we have to pre-compute the paths of all the local blocks so that we can
    // rewrite the path in the compiled output of the definition file.
    for (let block of blocks) {
      let outputPath = getOutputPath(this.input, block);
      if (outputPath) blockOutputPaths.set(block, outputPath);
    }

    await this.buildCompiledBlocks(blocks, config, blockOutputPaths, additionalFileCacheKeys, templateBlocks);

    await this.buildSerializedAnalyses(analyses, blockOutputPaths, additionalFileCacheKeys);

    if (this.persist) {
      for (let analysis of additionalFileCacheKeys.keys()) {
        let cacheKey = this.additionalFilesCacheKey(this.inputFileCacheKey(analysis.template.relativePath));
        let additionalCacheKeys = additionalFileCacheKeys.get(analysis);
        await (<PersistentStrategy>this.processor.processor)._cache?.set(cacheKey, JSON.stringify(additionalCacheKeys));
        this.debug(`Stored ${additionalCacheKeys.length} additional output files for ${analysis.template.relativePath} to cache.`);
        this.debug(`Cache keys are: ${additionalCacheKeys.join(", ")}`);
      }
    }
  }

  async buildCompiledBlocks(
    blocks: Set<Block>,
    config: Readonly<Configuration>,
    blockOutputPaths: Map<Block, string>,
    additionalFileCacheKeys: MultiMap<EmberAnalysis, string>,
    templateBlocks: MultiMap<EmberAnalysis, Block>,
  ): Promise<void> {
    let compiler = new BlockCompiler(postcss, this.parserOpts);
    compiler.setDefinitionCompiler(new BlockDefinitionCompiler(
      postcss,
      (b, p) => {
        let basePath = blockOutputPaths.get(b)!;
        let referencedBlock: Block = b.blockReferencePaths.get(p)!;
        let toPath = blockOutputPaths.get(referencedBlock);
        if (!toPath) return p; // block is not part of this tree, keep the import as-is.
        let relativePath = path.relative(path.dirname(basePath), toPath);
        if (!relativePath.startsWith(".")) {
          relativePath = `./${relativePath}`;
        }
        debug("Constructing block import. %s => %s becomes %s", basePath, toPath, relativePath);
        return relativePath;
      },
      this.parserOpts));
    for (let block of blocks) {
      this.debug(`compiling: ${config.importer.debugIdentifier(block.identifier, config)}`);
      let outputPath = blockOutputPaths.get(block);
      // Skip processing if we don't get an output path. This happens for files that
      // get referenced in @block from node_modules.
      if (!outputPath) {
        continue;
      }
      if (!block.stylesheet) {
        throw new Error("[internal error] block stylesheet expected.");
      }
      // TODO - allow for inline definitions or files, by user option
      let { css: compiledAST } = compiler.compileWithDefinition(block, block.stylesheet, this.analyzingRewriter!.reservedClassNames(), INLINE_DEFINITION_FILE);
      // TODO disable source maps in production?
      let result = compiledAST.toResult({ to: outputPath, map: { inline: true } });
      let contents = result.css;
      if (this.persist) {
        // We only compile and output each block once, but a block might be consumed
        // by several of the templates that we have processed. So we have to figure out
        // which template(s) depend on the block we're writing.
        for (let {analysis} of this.analyzingRewriter!.analyzedTemplates()) {
          if (templateBlocks.hasValue(analysis, block)) {
            await this.cacheAdditionalFile(additionalFileCacheKeys, analysis, {outputPath, contents});
          }
        }
      }
      this.output.writeFileSync(outputPath, contents, "utf8");
      this.debug(`compiled: ${outputPath}`);
    }
  }

  async buildSerializedAnalyses(
    analyses: Array<EmberAnalysis>,
    blockOutputPaths: Map<Block, string>,
    additionalFileCacheKeys: MultiMap<EmberAnalysis, string>,
  ): Promise<void> {
    for (let analysis of analyses) {
      let outputPath = analysisPath(analysis.template.relativePath);
      let contents = JSON.stringify(analysis.serializeSource(blockOutputPaths));
      await this.cacheAdditionalFile(additionalFileCacheKeys, analysis, {outputPath, contents});
      this.output.mkdirSync(path.dirname(outputPath), { recursive: true });
      this.output.writeFileSync(
        outputPath,
        contents,
        "utf8",
      );
      this.debug(`Analyzed ${analysis.template.relativePath} => ${outputPath}`);
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
      this.debug(`Wrote cache key ${cacheKey} for ${additionalFile.outputPath}`);
    }
  }

  // We override broccoli-persistent-filter's _handleFile implementation
  // in order to extract the additional output files from cache when the file is cached.
  // ideally this would be a capability provided by broccoli-persistent-filter, because
  // in those cases, it would be able to recover from a missing cache entry correctly.
  async _handleFile(relativePath: string, srcDir: string, destDir: string, entry: Parameters<TemplateCompilerPlugin["_handleFile"]>[3], outputPath: string, forceInvalidation: boolean, isChange: boolean, stats: Parameters<TemplateCompilerPlugin["_handleFile"]>[7]) {
    let cached = false;
    let mainFileCacheKey: string | undefined;
    if (this.persist) {
      // check if the persistent cache is warm for the main file being handled.
      mainFileCacheKey = this.inputFileCacheKey(relativePath);
      let result = await (<PersistentStrategy>this.processor.processor)._cache!.get(mainFileCacheKey);
      cached = result.isCached;
    }
    let additionalFiles = new Array<AdditionalFile>();
    let consistentCache = true;

    if (cached && !forceInvalidation) {
      // first we read the list of additional cache keys for other output files.
      let additionalFilesCacheKey = this.additionalFilesCacheKey(mainFileCacheKey!);
      let cacheKeysCacheResult = await (<PersistentStrategy>this.processor.processor)._cache!.get<string>(additionalFilesCacheKey);
      if (cacheKeysCacheResult.isCached) {
        let additionalCacheKeys: Array<string> = JSON.parse(cacheKeysCacheResult.value);
        // for each cache key we read out the additional file metadata that is cached and write the additional files to the output tree.
        for (let cacheKey of additionalCacheKeys) {
          let additionalFileCacheResult = await (<PersistentStrategy>this.processor.processor)._cache!.get<string>(cacheKey);
          if (!additionalFileCacheResult.isCached) {
            this.debug(`The cache is inconsistent (missing: ${cacheKey}). Force invalidating the template.`);
            forceInvalidation = true;
            consistentCache = false;
          }
          additionalFiles.push(JSON.parse(additionalFileCacheResult.value));
        }
        this.debug(`Wrote ${additionalCacheKeys.length} additional cached files for ${relativePath}`);
      } else {
        // this happens when the file isn't a css-blocks based template.
        this.debug(`No additional cached files for ${relativePath}`);
      }
    }

    let result = await super._handleFile(relativePath, srcDir, destDir, entry, outputPath, forceInvalidation, isChange, stats);

    if (cached && consistentCache) {
      for (let additionalFile of additionalFiles) {
        this.output.mkdirSync(path.dirname(additionalFile.outputPath), { recursive: true });
        this.output.writeFileSync(additionalFile.outputPath, additionalFile.contents, this.outputEncoding || "utf8");
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

function getOutputPath(input: MergedFileSystem, block: Block): string | null {
  if (isBroccoliTreeIdentifier(block.identifier)) {
    let blockPath = identToPath(input, block.identifier);
    let parsed = path.parse(blockPath);
    delete parsed.base;
    parsed.ext = ".css";
    parsed.name = parsed.name.replace(".block", ".compiledblock");
    return path.format(parsed);
  } else {
    return null;
  }
}

function nativePromise(work: () => void | PromiseLike<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let buildResult = work() || Promise.resolve();
      buildResult.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}
