import Tapable = require("tapable");
import * as webpack from "webpack";
import * as postcss from "postcss";
import * as path from "path";
import { TemplateAnalyzer, StyleAnalysis, BlockCompiler, PluginOptions as CssBlocksOptions } from "css-blocks";
import VirtualModulePlugin = require("virtual-module-webpack-plugin");

export interface CssBlocksPluginOptions {
  templateAnalyzer?: TemplateAnalyzer;
  compilationOptions?: CssBlocksOptions;
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
    // console.log("registering analysis plugin");
    compiler.plugin("before-run", (_params, cb) => {
      // console.log("starting analysis");
      this.analyzer.analyze().then((analysis: StyleAnalysis) => {
        // console.log("analysis complete", analysis);
        this.applyPlugins("after-template-analysis", analysis);
        cb();
      });
    });
  }
  afterTemplateAnalysis(handler: (analysis: StyleAnalysis) => any) {
    this.plugin("after-template-analysis", handler);
  }
  onStartingTemplateAnalysis(handler: (analysis: Promise<StyleAnalysis>) => any) {
    this.plugin("starting-template-analysis", handler);
  }
}

interface HasFilesystem {
  fileSystem: any;
}

/* exposes plugin events for optimizer to tap into */
export class CssBlocksCompilerPlugin extends Tapable implements webpack.Plugin {
  analysis: StyleAnalysis | undefined;
  pendingAnalysis: Promise<StyleAnalysis> | undefined;
  options: CssBlocksPluginOptions | undefined;
  _entryPoint: string | undefined;

  constructor(options?: CssBlocksPluginOptions) {
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

  asPromised(): Promise<StyleAnalysis> {
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
        // console.log("resolving app css", request);
        return self.asPromised().then(analysis => {
          let options: CssBlocksOptions = self.options && self.options.compilationOptions || {};
          let blockCompiler = new BlockCompiler(postcss, options);
          let cssBundle: string[] = [];
          let assetPath = path.join(path.dirname(request.descriptionFilePath), "css-blocks", self._entryPoint || "");
          // console.log(assetPath);
          analysis.blockDependencies().forEach(block => {
            if (block.root && block.source) {
              cssBundle.push(blockCompiler.compile(block, block.root, analysis).toString());
            }
          });
          VirtualModulePlugin.populateFilesystem({fs: fs, modulePath: assetPath, contents: cssBundle.join("\n"), ctime: VirtualModulePlugin.statsDate()});
          // console.log("populated app css", fs.readFileSync(assetPath));
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
  setAnalysis(analysis: StyleAnalysis) {
    this.analysis = analysis;
  }
  setPendingAnalysis(analysis: Promise<StyleAnalysis>) {
    this.pendingAnalysis = analysis;
  }
  getTemplateAnalysisHandler() {
    let self = this;
    return function(analysis: StyleAnalysis) {
      // console.log("compiler got analysis");
      // console.log("Need to compile:");
      // analysis.transitiveBlockDependencies().forEach(d => {
      //   console.log(d.source);
      // });
      self.setAnalysis(analysis);
    };
  }
  getTemplateAnalysisStartedHandler() {
    let self = this;
    return function(analysis: Promise<StyleAnalysis>) {
      // console.log("compiler got pending analysis");
      self.setPendingAnalysis(analysis);
    };
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

export class CssBlocksPlugin extends Tapable implements webpack.Plugin {
  options: CssBlocksPluginOptions;
  compilerPlugin: CssBlocksCompilerPlugin;

  constructor(options?: CssBlocksPluginOptions) {
    super();
    this.options = options || {};
    this.compilerPlugin = new CssBlocksCompilerPlugin();
  }

  apply(compiler: webpack.Compiler) {
    // console.log("setting up css block plugins");
    // console.log(this.options);
    let analyzer: CssBlocksTemplateAnalysisPlugin | undefined;
    if (this.options.templateAnalyzer) {
      analyzer = new CssBlocksTemplateAnalysisPlugin(this.options.templateAnalyzer);
      analyzer.afterTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisHandler());
      analyzer.onStartingTemplateAnalysis(this.compilerPlugin.getTemplateAnalysisStartedHandler());
      analyzer.apply(compiler);
      this.compilerPlugin.apply(compiler);
    }
    compiler.plugin("compilation", (_compilation) => {
      // console.log("coordinator", compilation);
    });
  }

  entryPoint(): string {
    return this.compilerPlugin.entryPoint();
  }
}
