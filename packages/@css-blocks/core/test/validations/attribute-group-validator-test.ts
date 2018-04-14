import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { BlockFactory } from "../../src/BlockParser";
import { Block } from "../../src/BlockTree";
import { Options, resolveConfiguration } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";
import { assertParseError } from "../util/assertError";
import { setupImporting } from "../util/setupImporting";
import { TestAnalyzer } from "../util/TestAnalyzer";

type BlockAndRoot = [Block, postcss.Container];

@suite("Attribute Group Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when two static attributes from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer();
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
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
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
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
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
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
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
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
