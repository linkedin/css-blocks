import { Template } from "@opticss/template-api";

import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { Block, MockImporter, SerializedAnalysis, TemplateAnalysisError } from "../../src";

import { BEMProcessor } from "../util/BEMProcessor";
import { TestAnalyzer } from "../util/TestAnalyzer";

@suite("Root Class Validator")
export class AnalysisTests extends BEMProcessor {

  @test "adding both root and a class from the same block to the same elment throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let options = {};

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
      "Cannot put block classes on the block's root element (templates/my-template.hbs:10:32)",
      this.parseBlock("blocks/foo.block.css", css, options).then(([block, _]): [Block, postcss.Container] => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(block.getClass("fdsa")!);
        analysis.endElement(element);
        return [block, _];
      }),
    );
  }

  @test "adding both root and an attribute from the same block to the same element is allowed"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let options = {};

    let css = `
      :scope { color: blue; }
      :scope[state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock("blocks/foo.block.css", css, options).then(([block, _]): [Block, postcss.Container] => {
      analysis.addBlock("", block);
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|foo]")!);
      analysis.endElement(element);
      return [block, _];
    });
  }

  @test "classes from other blocks may be added to the root element"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let importer = new MockImporter();
    let options = { importer };

    importer.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let css = `
      @block a from "a.css";
      :scope { color: blue; }
    `;

    return this.parseBlock("blocks/foo.block.css", css, options).then(([block, _]) => {
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      analysis.addBlock("", block);
      analysis.addBlock("a", aBlock);
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticClass(aBlock.getClass("foo")!);
      analysis.endElement(element);

      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<"Opticss.Template"> = {
        blocks: { "": "blocks/foo.block.css", "a": "blocks/a.css" },
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs" },
        stylesFound: [":scope", "a.foo"],
        elements: {
          a: {
            dynamicClasses: [],
            dynamicAttributes: [],
            sourceLocation: {
              start: {
                column: 32,
                filename: "templates/my-template.hbs",
                line: 10,
              },
            },
            staticStyles: [0, 1],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

}
