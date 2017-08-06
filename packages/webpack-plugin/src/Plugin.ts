import Tapable = require("tapable");
import { Plugin as WebpackPlugin, Compiler as WebpackCompiler } from "webpack";
import * as debugGenerator from "debug";
import * as postcss from "postcss";
import * as path from "path";
import { SourceMapSource, ConcatSource } from 'webpack-sources';

import {
  MultiTemplateAnalyzer,
  TemplateInfo,
  MetaTemplateAnalysis,
  Block,
  BlockCompiler,
  PluginOptions as CssBlocksOptions,
  PluginOptionsReader as CssBlocksOptionsReader,
  // StyleMapping,
  MetaStyleMapping,
} from "css-blocks";

export interface CssBlocksWebpackOptions<Template extends TemplateInfo> {
  /// The name of the instance of the plugin. Defaults to outputCssFile.
  name?: string;
  /// The analzyer that decides what templates are analyzed and what blocks will be compiled.
  analyzer: MultiTemplateAnalyzer<Template>;
  /// The output css file for all compiled CSS Blocks. Defaults to "css-blocks.css"
  outputCssFile?: string;
  /// Compilation options pass to css-blocks
  compilationOptions?: CssBlocksOptions;
}

interface CompilationResult<Template extends TemplateInfo> {
  css: ConcatSource;
  mapping: MetaStyleMapping<Template>;
}

export interface BlockCompilationComplete<Template extends TemplateInfo> {
  compilation: any;
  assetPath: string;
  mapping: MetaStyleMapping<Template>;
}

export class CssBlocksPlugin<Template extends TemplateInfo>
  extends Tapable
  implements WebpackPlugin
{
  name: string;
  analyzer: MultiTemplateAnalyzer<Template>;
  projectDir: string;
  outputCssFile: string;
  compilationOptions: CssBlocksOptions;
  debug: (message: string) => void;

  constructor(options: CssBlocksWebpackOptions<Template>) {
    super();

    this.debug = debugGenerator("css-blocks:webpack");
    this.analyzer = options.analyzer;
    this.outputCssFile = options.outputCssFile || "css-blocks.css";
    this.name = options.name || this.outputCssFile;
    this.compilationOptions = options.compilationOptions || {};
    this.projectDir = process.cwd();
  }
  apply(compiler: WebpackCompiler) {
    this.projectDir = compiler.options.context || this.projectDir;
    let outputPath = compiler.options.output && compiler.options.output.path || this.projectDir; // TODO What is the webpack default output directory?
    compiler.plugin("make", (compilation: any, cb: (error?: Error) => void) => {
      this.analyzer.reset();
      this.trace(`starting analysis.`);
      let pendingResult: Promise<BlockCompilationComplete<Template>> =
        this.analyzer.analyze().catch((err) => {
          this.trace(`Error during analysis. Draining queue.`);
          return this.analyzer.blockFactory.prepareForExit().then(() => {
            this.trace(`Drained. Raising error.`);
            throw err;
          });
        }).then(analysis => {
          return this.compileBlocks(<MetaTemplateAnalysis<Template>>analysis, path.join(outputPath, this.outputCssFile));
        }).then(result => {
          this.trace(`setting css asset: ${this.outputCssFile}`);
          compilation.assets[this.outputCssFile] = result.css;
          let completion: BlockCompilationComplete<Template> = {
            compilation: compilation,
            assetPath: this.outputCssFile,
            mapping: result.mapping
          };
          return completion;
        }).then<BlockCompilationComplete<Template>>((completion) => {
          this.trace(`notifying of completion`);
          this.notifyComplete(completion, cb);
          this.trace(`notified of completion`);
          return completion;
        }, <any>cb);
      compilation.plugin("normal-module-loader", (context: any, mod: any) => {
        this.trace(`preparing normal-module-loader for ${mod.resource}`);
        context.cssBlocks = context.cssBlocks || {mappings: {}, compilationOptions: this.compilationOptions};
        if (context.cssBlocks.mappings[this.outputCssFile]) {
          throw new Error(`css conflict detected. Multiple compiles writing to ${this.outputCssFile}`);
        } else {
          context.cssBlocks.mappings[this.outputCssFile] = pendingResult.then(compilationResult => {
            return compilationResult.mapping;
          });
        }
      });
      this.trace(`notifying of pending compilation`);
      this.notifyPendingCompilation(pendingResult);
      this.trace(`notified of pending compilation`);
    });
  }
  private compileBlocks(analysis: MetaTemplateAnalysis<Template>, cssOutputName: string): CompilationResult<Template> {
    let options: CssBlocksOptions = this.compilationOptions;
    let reader = new CssBlocksOptionsReader(options);
    let blockCompiler = new BlockCompiler(postcss, options);
    let cssBundle = new ConcatSource();
    let numBlocks = 0;
    analysis.blockDependencies().forEach((block: Block) => {
      if (block.root && block.identifier) {
        this.trace(`compiling ${block.identifier}.`);
        let originalSource = block.root.toString();
        let root = blockCompiler.compile(block, block.root, analysis);
        let result = root.toResult({to: cssOutputName, map: { inline: false, annotation: false }});
        // TODO: handle a sourcemap from compiling the block file via a preprocessor.
        let filename = reader.importer.filesystemPath(block.identifier, reader) || reader.importer.debugIdentifier(block.identifier, reader);
        let source = new SourceMapSource(result.css, filename,
                                          result.map.toJSON(), originalSource);
        cssBundle.add(source);
        numBlocks++;
      }
    });
    this.trace(`compiled ${numBlocks} blocks.`);
    let metaMapping = MetaStyleMapping.fromMetaAnalysis(analysis, reader);
    return {
      css: cssBundle,
      mapping: metaMapping
    };
  }
  trace(message: string) {
    message = message.replace(this.projectDir + "/", "");
    this.debug(`[${this.name}] ${message}`);
  }
  onPendingCompilation(handler: (pendingResult: Promise<BlockCompilationComplete<Template>>) => void) {
    this.plugin("block-compilation-pending", handler);
  }
  notifyPendingCompilation(pendingResult: Promise<BlockCompilationComplete<Template>>) {
    this.applyPlugins("block-compilation-pending", pendingResult);
  }
  onComplete(handler: (result: BlockCompilationComplete<Template>, cb: (err: Error) => void) => void) {
    this.plugin("block-compilation-complete", handler);
  }
  notifyComplete(result: BlockCompilationComplete<Template>, cb: (err: Error) => void) {
    this.applyPluginsAsync("block-compilation-complete", result, cb);
  }
}
