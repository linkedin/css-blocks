import { TemplateTypes } from "@opticss/template-api";
import { ObjectDictionary } from "@opticss/util";
import * as debugGenerator from "debug";
import { postcss } from "opticss";
import * as path from "path";
import { RawSourceMap } from "source-map";
import * as Tapable from "tapable";
import { Compiler as WebpackCompiler, Plugin as WebpackPlugin } from "webpack";
import { RawSource, Source, SourceMapSource } from "webpack-sources";

import {
  Analysis,
  Analyzer as AnalyzerType,
  Block,
  BlockCompiler,
  Options as CSSBlocksOptions,
  StyleMapping,
  resolveConfiguration,
} from "@css-blocks/core";
import {
  Actions,
  DEFAULT_OPTIONS,
  OptiCSSOptions,
  OptimizationResult,
  Optimizer,
} from "opticss";

import { LoaderContext } from "./context";

export type TmpType = keyof TemplateTypes;
export type Analyzer = AnalyzerType<TmpType>;
export type PendingResult = Promise<StyleMapping<TmpType> | void>;

export interface CssBlocksWebpackOptions {
  /// The name of the instance of the plugin. Defaults to outputCssFile.
  name?: string;
  /// The analyzer that decides what templates are analyzed and what blocks will be compiled.
  analyzer: Analyzer;
  /// The output css file for all compiled CSS Blocks. Defaults to "css-blocks.css"
  outputCssFile?: string;
  /// Compilation options pass to css-blocks
  compilationOptions?: CSSBlocksOptions;
  /// Optimization options passed to opticss
  optimization?: OptiCSSOptions;
}

// there's not any good types for webpack's internals.
// tslint:disable-next-line:prefer-whatever-to-any
export type WebpackAny = any;

export interface BlockCompilationError {
  compilation: WebpackAny;
  assetPath: string;
  error: Error;
  mapping?: StyleMapping<TmpType>;
  optimizerActions?: Actions;
}
export interface BlockCompilationComplete {
  compilation: WebpackAny;
  assetPath: string;
  mapping: StyleMapping<TmpType>;
  optimizerActions: Actions;
}

type Assets = ObjectDictionary<Source>;

interface CompilationResult {
  optimizationResult: OptimizationResult;
  blocks: Set<Block>;
  analyses: Array<Analysis<TmpType>>;
}

export class CssBlocksRewriterPlugin
  extends Tapable
  implements WebpackPlugin
{
  parent: CssBlocksPlugin;
  compilationOptions: CSSBlocksOptions;
  outputCssFile: string;
  name: string;
  debug: debugGenerator.IDebugger;
  pendingResult?: PendingResult;
  constructor(parent: CssBlocksPlugin) {
    super();
    this.debug = parent.debug;
    this.outputCssFile = parent.outputCssFile;
    this.name = parent.name;
    this.compilationOptions = parent.compilationOptions;
    this.parent = parent;
    parent.onCompilationExpiration(() => {
      this.trace(`resetting pending compilation.`);
      this.pendingResult = undefined;
    });
    parent.onPendingCompilation((pendingResult) => {
      this.trace(`received pending compilation.`);
      this.pendingResult = pendingResult;
    });
  }

  apply(compiler: WebpackCompiler) {
    compiler.plugin("compilation", (compilation: WebpackAny) => {
      compilation.plugin("normal-module-loader", (context: LoaderContext, mod: WebpackAny) => {
        this.trace(`preparing normal-module-loader for ${mod.resource}`);
        context.cssBlocks = context.cssBlocks || { mappings: {}, compilationOptions: this.compilationOptions };

        // If we're already waiting for a css file of this name to finish compiling, throw.
        if (context.cssBlocks.mappings[this.outputCssFile]) {
          throw new Error(`css conflict detected. Multiple compiles writing to ${this.parent.outputCssFile}?`);
        }

        if (this.pendingResult === undefined) {
          throw new Error(`No pending result is available yet.`);
        }
        context.cssBlocks.mappings[this.outputCssFile] = this.pendingResult;
      });
    });
  }

  trace(message: string) {
    message = message.replace(this.parent.projectDir + "/", "");
    this.debug(`[${this.name}] ${message}`);
  }

}

export class CssBlocksPlugin
  extends Tapable
  implements WebpackPlugin
{
  optimizationOptions: OptiCSSOptions;
  name: string;
  analyzer: Analyzer;
  projectDir: string;
  outputCssFile: string;
  compilationOptions: CSSBlocksOptions;
  debug: debugGenerator.IDebugger;

  constructor(options: CssBlocksWebpackOptions) {
    super();

    this.debug = debugGenerator("css-blocks:webpack");
    this.analyzer = options.analyzer;
    this.outputCssFile = options.outputCssFile || "css-blocks.css";
    this.name = options.name || this.outputCssFile;
    this.compilationOptions = options.compilationOptions || {};
    this.projectDir = process.cwd();
    this.optimizationOptions = Object.assign({}, DEFAULT_OPTIONS, options.optimization);
  }

  getRewriterPlugin(): CssBlocksRewriterPlugin {
    return new CssBlocksRewriterPlugin(this);
  }

  private async handleMake(outputPath: string, assets: Assets, compilation: WebpackAny, cb: (error?: Error) => void) {
    // Start analysis with a clean analysis object
    this.trace(`starting analysis.`);
    this.analyzer.reset();

    // Try to run our analysis.
    let entries = compilation.options.entry as string[];
    let pending: PendingResult = this.analyzer.analyze(...entries)
      // If analysis fails, drain our BlockFactory, add error to compilation error list and propagate.
      .catch((err: Error) => {
        this.trace(`Error during analysis. Draining queue.`);
        return this.analyzer.blockFactory.prepareForExit().then(() => {
          this.trace(`Drained. Raising error.`);
          throw err; // We're done, throw to skip the rest of the plugin steps below.
        });
      })

      // If analysis finished successfully, compile our blocks to output.
      .then((analysis: Analyzer) => {
        return this.compileBlocks(analysis, path.join(outputPath, this.outputCssFile));
      })

      // Add the resulting css output to our build.
      .then((result: CompilationResult) => {
        this.trace(`setting css asset: ${this.outputCssFile}`);
        let source: Source;
        if (result.optimizationResult.output.sourceMap) {
          let resultMap = result.optimizationResult.output.sourceMap;
          let rawSourceMap: RawSourceMap;
          if (typeof resultMap === "string") {
            rawSourceMap = JSON.parse(resultMap);
          } else {
            rawSourceMap = resultMap;
          }
          source = new SourceMapSource(
            result.optimizationResult.output.content.toString(),
            "optimized css",
            rawSourceMap);
        } else {
          source = new RawSource(result.optimizationResult.output.content.toString());
        }
        assets[`${this.outputCssFile}.log`] = new RawSource(result.optimizationResult.actions.performed.map(a => a.logString()).join("\n"));
        assets[this.outputCssFile] = source;
        let completion: BlockCompilationComplete = {
          compilation: compilation,
          assetPath: this.outputCssFile,
          mapping: new StyleMapping(result.optimizationResult.styleMapping, result.blocks, resolveConfiguration(this.compilationOptions), result.analyses),
          optimizerActions: result.optimizationResult.actions,
        };
        return completion;
      })

      // Notify the world when complete.
      .then((completion: BlockCompilationComplete) => {
        this.trace(`notifying of completion`);
        this.notifyComplete(completion, cb);
        this.trace(`notified of completion`);
        return completion;
      })

      // Return just the mapping object from this promise.
      .then((compilationResult: BlockCompilationComplete): StyleMapping<TmpType> => {
        return compilationResult.mapping;
      })

      // If something bad happened, log the error and pretend like nothing happened
      // by notifying deps of completion and returning an empty MetaStyleMapping
      // so compilation can continue.
      .catch((error: Error) => {
        this.trace(`notifying of compilation failure`);
        compilation.errors.push(error);
        this.notifyComplete({
          error,
          compilation,
          assetPath: this.outputCssFile,
        },                  cb);
        this.trace(`notified of compilation failure`);
      });

    this.trace(`notifying of pending compilation`);
    this.notifyPendingCompilation(pending);
    this.trace(`notified of pending compilation`);
  }

  apply(compiler: WebpackCompiler) {
    this.projectDir = compiler.options.context || this.projectDir;
    let outputPath = compiler.options.output && compiler.options.output.path || this.projectDir; // TODO What is the webpack default output directory?
    let assets: Assets = {};

    compiler.plugin("this-compilation", (compilation) => {
      this.notifyCompilationExpiration();

      compilation.plugin("additional-assets", (cb: () => void) => {
        Object.assign(compilation.assets, assets);
        cb();
      });
    });

    compiler.plugin("make", this.handleMake.bind(this, outputPath, assets));

    this.getRewriterPlugin().apply(compiler);
  }

  private compileBlocks(analyzer: Analyzer, cssOutputName: string): Promise<CompilationResult> {
    let options = resolveConfiguration(this.compilationOptions);
    let blockCompiler = new BlockCompiler(postcss, options);
    let numBlocks = 0;
    let optimizer = new Optimizer(this.optimizationOptions, analyzer.optimizationOptions);
    let blocks = analyzer.transitiveBlockDependencies();
    for (let block of blocks) {
      if (block.stylesheet && block.identifier) {
        blocks.add(block);
        this.trace(`compiling ${block.identifier}.`);
        let root = blockCompiler.compile(block, block.stylesheet, analyzer);
        let result = root.toResult({to: cssOutputName, map: { inline: false, annotation: false }});
        // TODO: handle a sourcemap from compiling the block file via a preprocessor.
        let filename = options.importer.filesystemPath(block.identifier, options) || options.importer.debugIdentifier(block.identifier, options);
        optimizer.addSource({
          content: result.css,
          filename,
          sourceMap: result.map.toJSON(),
        });
        numBlocks++;
      }
    }
    let analyses = analyzer.analyses();
    for (let a of analyses) {
      this.trace(`Adding analysis for ${a.template.identifier} to optimizer.`);
      this.trace(`Analysis for ${a.template.identifier} has ${a.elementCount()} elements.`);
      optimizer.addAnalysis(a.forOptimizer(options));
    }
    this.trace(`compiled ${numBlocks} blocks.`);
    return optimizer.optimize(cssOutputName).then(optimizationResult => {
      return {
        optimizationResult,
        blocks,
        analyses,
      };
    });
  }
  trace(message: string) {
    message = message.replace(this.projectDir + "/", "");
    this.debug(`[${this.name}] ${message}`);
  }
  /**
   * Fires when the compilation promise is available.
   */
  onPendingCompilation(handler: (pendingResult: PendingResult) => void): void {
    this.plugin("block-compilation-pending", handler);
  }
  private notifyPendingCompilation(pendingResult: PendingResult): void {
    this.applyPlugins("block-compilation-pending", pendingResult);
  }
  /**
   * Fires when the compilation is first started to let any listeners know that
   * their current promise is no longer valid.
   */
  onCompilationExpiration(handler: () => void): void {
    this.plugin("block-compilation-expired", handler);
  }
  private notifyCompilationExpiration(): void {
    this.applyPlugins("block-compilation-expired");
  }
  /**
   * Fires when the compilation is done.
   */
  onComplete(handler: (result: BlockCompilationComplete | BlockCompilationError, cb: (err: Error) => void) => void): void {
    this.plugin("block-compilation-complete", handler);
  }
  private notifyComplete(result: BlockCompilationComplete | BlockCompilationError, cb: (err: Error) => void): void {
    this.applyPluginsAsync("block-compilation-complete", result, cb);
  }
}
