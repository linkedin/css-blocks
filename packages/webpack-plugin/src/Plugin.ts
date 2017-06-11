import Tapable = require("tapable");
import * as webpack from "webpack";
import { TemplateAnalyzer, StyleAnalysis } from "css-blocks";

export interface CssBlocksPluginOptions {
  templateAnalyzer?: TemplateAnalyzer;
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

/* exposes plugin events for optimizer to tap into */
export class CssBlocksCompilerPlugin extends Tapable implements webpack.Plugin {
  analysis: StyleAnalysis | undefined;
  pendingAnalysis: Promise<StyleAnalysis> | undefined;
  apply(compiler: webpack.Compiler) {
    compiler.plugin("compilation", (_compilation) => {
    });
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

export class CssBlocksPlugin extends Tapable implements webpack.Plugin {
  options: CssBlocksPluginOptions;

  constructor(options?: CssBlocksPluginOptions) {
    super();
    this.options = options || {};
  }

  apply(compiler: webpack.Compiler) {
    // console.log("setting up css block plugins");
    // console.log(this.options);
    let analyzer: CssBlocksTemplateAnalysisPlugin | undefined;
    if (this.options.templateAnalyzer) {
      analyzer = new CssBlocksTemplateAnalysisPlugin(this.options.templateAnalyzer);
      let blockCompilerPlugin = new CssBlocksCompilerPlugin();
      analyzer.afterTemplateAnalysis(blockCompilerPlugin.getTemplateAnalysisHandler());
      analyzer.onStartingTemplateAnalysis(blockCompilerPlugin.getTemplateAnalysisStartedHandler());
      analyzer.apply(compiler);
      blockCompilerPlugin.apply(compiler);
    }
    compiler.plugin("compilation", (_compilation) => {
      // console.log("coordinator", compilation);
    });
  }
}
