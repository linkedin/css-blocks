import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import * as cssBlocks from "../../src/errors";

import { BEMProcessor } from "../util/BEMProcessor";
import { setupImporting } from "../util/setupImporting";
import { TestAnalyzer } from "../util/TestAnalyzer";

@suite("Attribute Group Validator")
export class TemplateAnalysisTests extends BEMProcessor {
  @test "throws when two static attributes from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[state|test=foo] { color: red; }
      :scope[state|test=bar] { color: blue; }
    `;
    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group ":scope[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test=foo]")!);
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test=bar]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when static and dynamic attributes from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[state|test=foo] { color: red; }
      :scope[state|test=bar] { color: blue; }
    `;
    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group ":scope[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test=foo]")!);
        element.addDynamicAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test=bar]")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when static attributes and dynamic group from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[state|test=foo] { color: red; }
      :scope[state|test=bar] { color: blue; }
    `;
    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group ":scope[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test=foo]")!);
        element.addDynamicGroup(block.rootClass, block.rootClass.getAttribute("[state|test]")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when duplicate dynamic groups are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[state|test=foo] { color: red; }
      :scope[state|test=bar] { color: blue; }
    `;
    return this.assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group ":scope[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock("blocks/foo.block.css", css, config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.getAttribute("[state|test]")!, true);
        element.addDynamicGroup(block.rootClass, block.rootClass.getAttribute("[state|test]")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

}
