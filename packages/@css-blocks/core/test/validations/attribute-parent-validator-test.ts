import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { Block, BlockClass } from "../../src/BlockTree";
import * as cssBlocks from "../../src/errors";

import { BEMProcessor } from "../util/BEMProcessor";
import { setupImporting } from "../util/setupImporting";
import { TestAnalyzer } from "../util/TestAnalyzer";

@suite("State Parent Validator")
export class TemplateAnalysisTests extends BEMProcessor {

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[state|test] { color: red; }
    `;
    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ":scope[state|test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      .foo { color: blue; }
      .foo[state|test] { color: red; }
    `;

    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[state|test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("foo") as BlockClass;
        element.addStaticAttr(klass, klass.getAttributeValue("[state|test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));

  }

  @test "Throws when inherited states are applied without their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config, importer } = setupImporting();

    importer.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[state|color=yellow] {
        color: yellow;
      }
      .pretty[state|color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".pretty[state|color=yellow]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
        analysis.addBlock("", block);
        analysis.addBlock("a", aBlock);
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("pretty") as BlockClass;
        let state = klass.resolveAttributeValue("[state|color=yellow]")!;
        if (!state) { throw new Error("No state group `color` resolved"); }
        element.addStaticAttr(klass, state);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "Inherited states pass validation when applied with their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config, importer } = setupImporting();

    importer.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[state|color=yellow] {
        color: yellow;
      }
      .pretty[state|color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      analysis.addBlock("", block);
      analysis.addBlock("a", aBlock);
      let element = analysis.startElement({ line: 10, column: 32 });
      let klass = block.getClass("pretty") as BlockClass;
      let state = klass.resolveAttributeValue("[state|color=yellow]");
      if (!state) { throw new Error("No state group `color` resolved"); }
      element.addStaticClass(klass);
      element.addStaticAttr(klass, state);
      analysis.endElement(element);
      assert.deepEqual(1, 1);
    });
  }
}
