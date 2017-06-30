import Tapable = require("tapable");
import * as webpack from "webpack";
import * as debugGenerator from "debug";
import * as postcss from "postcss";
import { RawSource } from 'webpack-sources';

import {
  TemplateAnalyzer,
  MetaTemplateAnalysis,
  Block,
  BlockCompiler,
  PluginOptions as CssBlocksOptions,
  PluginOptionsReader as CssBlocksOptionsReader,
  // StyleMapping,
  MetaStyleMapping,
} from "css-blocks";

export interface CssBlocksWebpackOptions {
  /// The name of the instance of the plugin. Defaults to outputCssFile.
  name?: string;
  /// The analzyer that decides what templates are analyzed and what blocks will be compiled.
  analyzer: TemplateAnalyzer;
  /// The output css file for all compiled CSS Blocks. Defaults to "css-blocks.css"
  outputCssFile?: string;
  /// Compilation options pass to css-blocks
  compilationOptions?: CssBlocksOptions;
}

interface CompilationResult {
  css: string;
  mapping: MetaStyleMapping;
}

export interface BlockCompilationComplete {
  compilation: any;
  assetPath: string;
  mapping: MetaStyleMapping;
}

export class CssBlocksPlugin
  extends Tapable
  implements webpack.Plugin
{
  name: string;
  analyzer: TemplateAnalyzer;
  projectDir: string;
  outputCssFile: string;
  compilationOptions: CssBlocksOptions;
  debug: (message: string) => void;

  constructor(options: CssBlocksWebpackOptions) {
    super();

    this.debug = debugGenerator("css-blocks:webpack");
    this.analyzer = options.analyzer;
    this.outputCssFile = options.outputCssFile || "css-blocks.css";
    this.name = options.name || this.outputCssFile;
    this.compilationOptions = options.compilationOptions || {};
    this.projectDir = process.cwd();
  }
  apply(compiler: webpack.Compiler) {
    this.projectDir = compiler.options.context || this.projectDir;
    // compiler.plugin("compilation", (compilation) => {
    // });
    compiler.plugin("make", (compilation: any, cb: (error?: Error) => void) => {
      this.analyzer.reset();
      this.trace(`starting analysis.`);
      let pendingResult: Promise<BlockCompilationComplete> =
        this.analyzer.analyze().then(analysis => {
          return this.compileBlocks(<MetaTemplateAnalysis>analysis);
        }).then(result => {
          this.trace(`setting css asset: ${this.outputCssFile}`);
          compilation.assets[this.outputCssFile] = new RawSource(result.css);
          let completion: BlockCompilationComplete = {
            compilation: compilation,
            assetPath: this.outputCssFile,
            mapping: result.mapping
          };
          return completion;
        }).then((completion) => {
          this.trace(`notifying of completion`);
          compilation.plugin("normal-module-loader", (context: any, _mod: any) => {
            this.trace(`preparing normal-module-loader`);
            context.cssBlocks = context.cssBlocks || {mappings: {}};
            if (context.cssBlocks.mappings[this.outputCssFile]) {
              throw new Error(`css conflict detected. Multiple compiles writing to ${this.outputCssFile}`);
            } else {
              context.cssBlocks.mappings[this.outputCssFile] = completion.mapping;
            }
          });
          this.notifyComplete(completion, cb);
          this.trace(`notified of completion`);
          return completion;
        }, (e: Error) => {
          console.error(e);
          cb(e);
        });
      this.trace(`notifying of pending compilation`);
      this.notifyPendingCompilation(pendingResult);
      this.trace(`notified of pending compilation`);
    });
  }
  private compileBlocks(analysis: MetaTemplateAnalysis): CompilationResult {
    let options: CssBlocksOptions = this.compilationOptions;
    let reader = new CssBlocksOptionsReader(options);
    let blockCompiler = new BlockCompiler(postcss, options);
    let cssBundle: string[] = [];
    analysis.blockDependencies().forEach((block: Block) => {
      console.log(block.debug(reader).join("\n"));
      if (block.root && block.source) {
        this.trace(`compiling ${block.source}.`);
        cssBundle.push(blockCompiler.compile(block, block.root, analysis).toString());
      }
    });
    this.trace(`compiled ${cssBundle.length} blocks.`);
    let metaMapping = MetaStyleMapping.fromMetaAnalysis(analysis, reader);
    return {
      css: cssBundle.join("\n"),
      mapping: metaMapping
    };
  }
  trace(message: string) {
    message = message.replace(this.projectDir + "/", "");
    this.debug(`[${this.name}] ${message}`);
  }
  onPendingCompilation(handler: (pendingResult: Promise<BlockCompilationComplete>) => void) {
    this.plugin("block-compilation-pending", handler);
  }
  notifyPendingCompilation(pendingResult: Promise<BlockCompilationComplete>) {
    this.applyPlugins("block-compilation-pending", pendingResult);
  }
  onComplete(handler: (result: BlockCompilationComplete, cb: (err: Error) => void) => void) {
    this.plugin("block-compilation-complete", handler);
  }
  notifyComplete(result: BlockCompilationComplete, cb: (err: Error) => void) {
    this.applyPluginsAsync("block-compilation-complete", result, cb);
  }
}