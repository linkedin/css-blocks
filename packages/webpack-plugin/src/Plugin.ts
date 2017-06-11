import Tapable from "tapable";
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
    compiler.plugin("before-compile", (params) => {
      console.log(params);
      this.analyzer.analyze().then((analysis: StyleAnalysis) => {
        this.applyPlugins("after-template-analysis", analysis);
      });
    });
  }
  afterTemplateAnalysis(handler: (analysis: StyleAnalysis) => any) {
    this.plugin("after-template-analysis", handler);
  }
}

/* exposes plugin events for optimizer to tap into */
export class CssBlocksCompilerPlugin extends Tapable implements webpack.Plugin {
  analysis: StyleAnalysis;
  apply(compiler: webpack.Compiler) {
    compiler.plugin("compilation", (_compilation) => {
    });
  }
  setAnalysis(analysis: StyleAnalysis) {
    this.analysis = analysis;
  }
  getTemplateAnalysisHandler() {
    let self = this;
    return function(analysis: StyleAnalysis) {
      console.log("compiler got analysis");
      self.setAnalysis(analysis);
    };
  }
}

/* exposes plugin events for optimizer to tap into */
export class CssBlocksOptimizerPlugin extends Tapable implements webpack.Plugin {
  apply(compiler: webpack.Compiler) {
    compiler.plugin("compilation", (compilation) => {
      console.log("compiler", compilation);
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
    let analyzer: CssBlocksTemplateAnalysisPlugin | undefined;
    if (this.options.templateAnalyzer) {
      analyzer = new CssBlocksTemplateAnalysisPlugin(this.options.templateAnalyzer);
      let blockCompilerPlugin = new CssBlocksCompilerPlugin();
      analyzer.afterTemplateAnalysis(blockCompilerPlugin.getTemplateAnalysisHandler());
    }
    compiler.plugin("compilation", (compilation) => {
      console.log("coordinator", compilation);
    });
  }
}
