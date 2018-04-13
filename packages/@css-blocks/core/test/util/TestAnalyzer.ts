import { Analyzer } from "../../src/Analyzer";

export class TestAnalyzer extends Analyzer<"Opticss.Template"> {
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
