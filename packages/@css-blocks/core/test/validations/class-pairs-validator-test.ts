import { Template } from "@opticss/template-api";
import { suite, test } from "mocha-typescript";

import { TemplateAnalysisError, resolveConfiguration } from "../../src";

import { BEMProcessor } from "../util/BEMProcessor";
import { TestAnalyzer } from "../util/TestAnalyzer";

@suite("Class Pairs Validator")
export class TemplateAnalysisTests extends BEMProcessor {

  @test "correlating two classes from the same block on the same element throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
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
    return this.assertParseError(
      TemplateAnalysisError,
      `Classes "fdsa" and "asdf" from the same block are not allowed on the same element at the same time. (templates/my-template.hbs:10:11)`,
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 11 });
        element.addStaticClass(block.getClass("asdf")!);
        element.addStaticClass(block.getClass("fdsa")!);
        analysis.endElement(element);
      }),
    );
  }
}
