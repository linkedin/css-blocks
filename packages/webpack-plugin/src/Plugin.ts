import Tapable = require("tapable");
import * as webpack from "webpack";
import * as postcss from "postcss";
import * as path from "path";
import * as debugGenerator from "debug";
import {
  TemplateAnalyzer,
  MetaTemplateAnalysis,
  Block,
  BlockCompiler,
  PluginOptions as CssBlocksOptions,
  PluginOptionsReader as CssBlocksOptionsReader,
  TemplateRewriter,
  StyleMapping,
  MetaStyleMapping,
} from "css-blocks";
import VirtualModulePlugin = require("virtual-module-webpack-plugin");

export interface CssBlocksPluginOptions<RewriterType extends TemplateRewriter> {
  templateAnalyzer?: TemplateAnalyzer;
  compilationOptions?: CssBlocksOptions;
  templateRewriter?: (mapping: StyleMapping | null) => RewriterType;
  enableTraceDebugging?: boolean;
  name?: string;
}

/* exposes plugin events for compiler to tap into */
export class CssBlocksTemplateAnalysisPlugin extends Tapable implements webpack.Plugin {
  analyzer: TemplateAnalyzer;
  constructor(analyzer: TemplateAnalyzer) {
    super();
    this.analyzer = analyzer;
  }
  apply(compiler: webpack.Compiler) {
    // compiler.plugin("watch-run", () => {
    //   this.analyzer.reset();
    // });
    let analyze = (cb: Function) => {
      this.trace("starting template analysis.");
      this.analyzer.analyze().then((analysis: MetaTemplateAnalysis) => {
        this.trace("template analysis complete.");
        this.applyPlugins("after-template-analysis", analysis);
        cb();
      }).catch((e) => {
        cb(e);
      });
    };
    compiler.plugin("run", function(_compiler, cb) {
      analyze(cb);
    });
    compiler.plugin("watch-run", function(_compiler, cb) {
      analyze(cb);
    });
  }
  afterTemplateAnalysis(handler: (analysis: MetaTemplateAnalysis) => any) {
    this.plugin("after-template-analysis", handler);
  }
  onStartingTemplateAnalysis(handler: (analysis: Promise<MetaTemplateAnalysis>) => any) {
    this.plugin("starting-template-analysis", handler);
  }
  trace(message: string) {
    this.applyPlugins("trace", message);
  }
  onTraceMessage(handler: TraceHandler) {
    this.plugin("trace", handler);
  }
}

interface HasFilesystem {
  fileSystem: any;
}

export type TraceHandler = (message: string)=> void;

/* exposes plugin events for optimizer to tap into */
export class CssBlocksCompilerPlugin<RewriterType extends TemplateRewriter> extends Tapable implements webpack.Plugin {
  analysis: MetaTemplateAnalysis | undefined;
  pendingAnalysis: Promise<MetaTemplateAnalysis> | undefined;
  options: CssBlocksPluginOptions<RewriterType> | undefined;
  _entryPoint: string | undefined;

  constructor(options?: CssBlocksPluginOptions<RewriterType>) {
    super();
    this.options = options || {};
  }

  entryPoint(): string {
    if (!this._entryPoint) {
      let ep = blockFilenameGenerator();
      this.trace(`entry point is ${ep}`);
      this._entryPoint = ep;
      return this._entryPoint;
    } else {
      throw new Error("Only one entry point per plugin is allowed.");
    }
  }

  asPromised(): Promise<MetaTemplateAnalysis> | null{
    if (this.analysis) {
      this.trace(`analysis promise requested but already resolved.`);
      return Promise.resolve(this.analysis);
    } else if (this.pendingAnalysis) {
      this.trace(`analysis promise requested but is still pending.`);
      return this.pendingAnalysis;
    } else {
      this.trace(`analysis promise requested but doesn't exist yet.`);
      return null;
    }
  }

  apply(compiler: any) {
    if (!this._entryPoint) {
      throw new Error("You must add entryPoint() to the webpack configuration before registering the css-blocks plugin.");
    }
    let self = this;
    let compileAndConcat = function(): Promise<string | null> {
        let promise = self.asPromised();
        if (promise === null) {
          self.trace(`giving up on contents for ${self._entryPoint}.`);
          return Promise.resolve(null);
        }
        return promise.then(analysis => {
          let options: CssBlocksOptions = self.options && self.options.compilationOptions || {};
          let blockCompiler = new BlockCompiler(postcss, options);
          let cssBundle: string[] = [];
          analysis.blockDependencies().forEach((block: Block) => {
            if (block.root && block.source) {
              self.trace(`compiling ${block.source}.`);
              cssBundle.push(blockCompiler.compile(block, block.root, analysis).toString());
            }
          });
          let metaMapping = MetaStyleMapping.fromMetaAnalysis(analysis, new CssBlocksOptionsReader(options));
          self.applyPlugins("after-compilation", metaMapping);
          self.trace(`compiled ${cssBundle.length} files for ${self._entryPoint}.`);
          return cssBundle.join("\n");
        }).catch((e) => {
          console.error(e);
          throw e;
        });
    };
    let resolverPlugin = function(this: HasFilesystem, request: any, cb: any) {
      const fs = this.fileSystem;
      if (request.path && request.path.endsWith(self._entryPoint)) {
        let assetPath = path.join(path.dirname(request.descriptionFilePath), "css-blocks", self._entryPoint || "");
        compileAndConcat().then(contents => {
          if (contents) {
            VirtualModulePlugin.populateFilesystem({fs: fs, modulePath: assetPath, contents: contents, ctime: VirtualModulePlugin.statsDate()});
            cb(null, {path: assetPath});
          } else {
            cb();
          }
        });
      } else {
        cb();
      }
    };
    if (!compiler.resolvers.normal) {
      compiler.plugin('after-resolvers', () => {
        compiler.resolvers.normal.plugin('file', resolverPlugin);
      });
    } else {
      compiler.resolvers.normal.plugin('file', resolverPlugin);
    }
  }
  onTraceMessage(handler: TraceHandler) {
    this.plugin("trace", handler);
  }
  trace(message: string) {
    this.applyPlugins("trace", message);
  }
  setAnalysis(analysis: MetaTemplateAnalysis) {
    this.analysis = analysis;
  }
  setPendingAnalysis(analysis: Promise<MetaTemplateAnalysis>) {
    this.pendingAnalysis = analysis;
  }
  getTemplateAnalysisHandler() {
    let self = this;
    return function(analysis: MetaTemplateAnalysis) {
      self.setAnalysis(analysis);
    };
  }
  getTemplateAnalysisStartedHandler() {
    let self = this;
    return function(analysis: Promise<MetaTemplateAnalysis>) {
      self.setPendingAnalysis(analysis);
    };
  }
  afterCompilation(handler: (mapping: MetaStyleMapping) => any) {
    this.plugin("after-compilation", handler);
  }
}

/* exposes plugin events for optimizer to tap into */
export class CssBlocksOptimizerPlugin extends Tapable implements webpack.Plugin {
  apply(compiler: webpack.Compiler) {
    compiler.plugin("compilation", (_compilation) => {
      // console.log("compiler", compilation);
    });
  }
}

let filenameCounter = 0;
function blockFilenameGenerator() {
  return `css-blocks-${++filenameCounter}.css`;
}

export class CssBlocksPlugin<RewriterType extends TemplateRewriter> extends Tapable implements webpack.Plugin {
  options: CssBlocksPluginOptions<RewriterType>;
  compilerPlugin: CssBlocksCompilerPlugin<RewriterType>;
  analyzerPlugin: CssBlocksTemplateAnalysisPlugin | undefined;
  compilationPromise: Promise<MetaStyleMapping>;
  debug: (message: string) => void;
  projectDir: string;
  constructor(options?: CssBlocksPluginOptions<RewriterType>) {
    super();
    this.options = options || {};
    this.compilerPlugin = new CssBlocksCompilerPlugin<RewriterType>();
    this.debug = debugGenerator("css-blocks:webpack");
    this.projectDir = process.cwd();
  }

  apply(compiler: webpack.Compiler) {
    this.projectDir = compiler.options.context || this.projectDir;
    this.trace("initializing sub-plugins.");
    if (this.options.templateAnalyzer) {
      this.analyzerPlugin = new CssBlocksTemplateAnalysisPlugin(this.options.templateAnalyzer);
      this.analyzerPlugin.onTraceMessage(this.getTraceHandler());
      this.compilerPlugin.onTraceMessage(this.getTraceHandler());
      this.analyzerPlugin.afterTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisHandler());
      this.analyzerPlugin.onStartingTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisStartedHandler());
      this.analyzerPlugin.apply(compiler);
      this.compilationPromise = new Promise((resolve, _reject) => {
        this.compilerPlugin.afterCompilation(mapping => {
          resolve(mapping);
        });
      });
      this.compilerPlugin.apply(compiler);
    }
    compiler.plugin("compilation", (_compilation) => {
      // console.log("coordinator", compilation);
    });
  }

  entryPoint(): string {
    return this.compilerPlugin.entryPoint();
  }

  rewriter(): (path: string) => Promise<RewriterType> {
    if (this.options.templateRewriter) {
      let rewriterMaker = this.options.templateRewriter;
      let self = this;
      return function(path) {
        self.trace(`template rewrite for ${path} requested`);
        return self.compilationPromise.then((mapping) => {
          let styleMapping = mapping.templates.get(path);
          if (styleMapping) {
            self.trace(`style mapping for ${path} exists for rewrite`);
            return rewriterMaker(styleMapping);
          } else {
            self.trace(`style mapping for ${path} not found for rewrite.`);
            return rewriterMaker(null);
          }
        }).catch((e) => {
          console.error(e);
          throw e;
        });
      };
    } else {
      throw new Error("Cannot call rewriter unless the templateRewriter option is set.");
    }
  }
  trace(message: string) {
    message = message.replace(this.projectDir + "/", "");
    this.debug(`[${this.options.name || 'unnamed plugin'}] ${message}`);
  }
  getTraceHandler(): TraceHandler {
    return (message: string) => {
      this.trace(message);
    };
  }
}
