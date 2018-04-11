import { Analyzer } from "css-blocks";

export class TestAnalyzer extends Analyzer<"WebpackPlugin.TestTemplate"> {
  analyze() { return Promise.resolve(this); }
  get optimizationOptions() {
    return {
      rewriteIdents: {
        id: false,
        class: true,
        omitIdents: {
          id: [],
          class: [],
        },
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }
}
