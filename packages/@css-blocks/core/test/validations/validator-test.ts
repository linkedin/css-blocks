import { POSITION_UNKNOWN } from "@opticss/element-analysis";
import { Template } from "@opticss/template-api";
import { suite, test } from "mocha-typescript";

import { TemplateAnalysisError, resolveConfiguration } from "../../src";

import { BEMProcessor } from "../util/BEMProcessor";
import { TestAnalyzer } from "../util/TestAnalyzer";

@suite("Validators")
export class TemplateAnalysisTests extends BEMProcessor {

  @test "built-in template validators may be configured with boolean values"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer({}, { validations: { "no-class-pairs": false }});
    let analysis = analyzer.newAnalysis(info);
    let config = resolveConfiguration({});

    let css = `
      :scope { color: blue; }
      :scope[state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
      analysis.addBlock("", block);
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.getClass("asdf")!);
      element.addStaticClass(block.getClass("fdsa")!);
      analysis.endElement(element);
    });
  }

  @test "custom template validators may be passed to analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer({}, { validations: { customValidator(data, _a, err) { if (data) err("CUSTOM ERROR"); } } });
    let analysis = analyzer.newAnalysis(info);
    let config = resolveConfiguration({});

    let css = `
      :scope { color: blue; }
    `;
    return this.assertParseError(
      TemplateAnalysisError,
      "CUSTOM ERROR (templates/my-template.hbs:1:2)",
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 1, column: 2 });
        analysis.endElement(element);
      }),
    );
  }

}
