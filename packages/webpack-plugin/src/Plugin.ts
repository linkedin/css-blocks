import Tapable = require("tapable");
import * as webpack from "webpack";
import * as postcss from "postcss";
import * as path from "path";
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
}

/* exposes plugin events for compiler to tap into */
export class CssBlocksTemplateAnalysisPlugin extends Tapable implements webpack.Plugin {
  analyzer: TemplateAnalyzer;
  constructor(analyzer: TemplateAnalyzer) {
    super();
    this.analyzer = analyzer;
  }
  apply(compiler: webpack.Compiler) {
    compiler.plugin("watch-run", () => {
      this.analyzer.reset();
    });
    compiler.plugin("before-run", (_params, cb) => {
      this.analyzer.analyze().then((analysis: MetaTemplateAnalysis) => {
        this.applyPlugins("after-template-analysis", analysis);
        cb();
      });
    });
  }
  afterTemplateAnalysis(handler: (analysis: MetaTemplateAnalysis) => any) {
    this.plugin("after-template-analysis", handler);
  }
  onStartingTemplateAnalysis(handler: (analysis: Promise<MetaTemplateAnalysis>) => any) {
    this.plugin("starting-template-analysis", handler);
  }
}

interface HasFilesystem {
  fileSystem: any;
}

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
      this._entryPoint = blockFilenameGenerator();
      return this._entryPoint;
    } else {
      throw new Error("Only one entry point per plugin is allowed.");
    }
  }

  asPromised(): Promise<MetaTemplateAnalysis> {
    if (this.analysis) {
      return Promise.resolve(this.analysis);
    } else if (this.pendingAnalysis) {
      return this.pendingAnalysis;
    } else {
      throw new Error("You gotta wait 'till the analysis starts.");
    }
  }

  apply(compiler: any) {
    if (!this._entryPoint) {
      throw new Error("You must add entryPoint() to the webpack configuration before registering the css-blocks plugin.");
    }
    let self = this;
    let resolverPlugin = function(this: HasFilesystem, request: any, cb: any) {
      const fs = this.fileSystem;
      if (request.path && request.path.endsWith(self._entryPoint)) {
        return self.asPromised().then(analysis => {
          let options: CssBlocksOptions = self.options && self.options.compilationOptions || {};
          let blockCompiler = new BlockCompiler(postcss, options);
          let cssBundle: string[] = [];
          let assetPath = path.join(path.dirname(request.descriptionFilePath), "css-blocks", self._entryPoint || "");
          analysis.blockDependencies().forEach((block: Block) => {
            if (block.root && block.source) {
              cssBundle.push(blockCompiler.compile(block, block.root, analysis).toString());
            }
          });
          let metaMapping = MetaStyleMapping.fromMetaAnalysis(analysis, new CssBlocksOptionsReader(options));
          self.applyPlugins("after-compilation", metaMapping);
          VirtualModulePlugin.populateFilesystem({fs: fs, modulePath: assetPath, contents: cssBundle.join("\n"), ctime: VirtualModulePlugin.statsDate()});
          cb(null, {path: assetPath});
        });
      } else {
        cb();
        return;
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
  compilationPromise: Promise<MetaStyleMapping>;
  constructor(options?: CssBlocksPluginOptions<RewriterType>) {
    super();
    this.options = options || {};
    this.compilerPlugin = new CssBlocksCompilerPlugin<RewriterType>();
  }

  apply(compiler: webpack.Compiler) {
    let analyzer: CssBlocksTemplateAnalysisPlugin | undefined;
    if (this.options.templateAnalyzer) {
      analyzer = new CssBlocksTemplateAnalysisPlugin(this.options.templateAnalyzer);
      analyzer.afterTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisHandler());
      analyzer.onStartingTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisStartedHandler());
      analyzer.apply(compiler);
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
        return self.compilationPromise.then((mapping) => {
          let styleMapping = mapping.templates.get(path);
          if (styleMapping) {
            return rewriterMaker(styleMapping);
          } else {
            return rewriterMaker(null);
          }
        });
      };
    } else {
      throw new Error("Cannot call rewriter unless the templateRewriter option is set.");
    }
  }
}
