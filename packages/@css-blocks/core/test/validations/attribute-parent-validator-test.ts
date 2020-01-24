import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { BlockFactory } from "../../src/BlockParser";
import { Block, BlockClass } from "../../src/BlockTree";
import { Options, resolveConfiguration } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";
import { assertParseError } from "../util/assertError";
import { setupImporting } from "../util/setupImporting";
import { TestAnalyzer } from "../util/TestAnalyzer";

type BlockAndRoot = [Block, postcss.Container];

@suite("State Parent Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parseRootFaultTolerant(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[test] { color: red; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ":scope[test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      .foo { color: blue; }
      .foo[test] { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("foo") as BlockClass;
        element.addStaticAttr(klass, klass.getAttributeValue("[test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));

  }

  @test "Throws when inherited states are applied without their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[color=yellow] {
        color: yellow;
      }
      .pretty[color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[color=black] {
        color: black;
      }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".pretty[color=yellow]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
        analysis.addBlock("", block);
        analysis.addBlock("a", aBlock);
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("pretty") as BlockClass;
        let state = klass.resolveAttributeValue("[color=yellow]")!;
        if (!state) { throw new Error("No state group `color` resolved"); }
        element.addStaticAttr(klass, state);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "Inherited states pass validation when applied with their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[color=yellow] {
        color: yellow;
      }
      .pretty[color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[color=black] {
        color: black;
      }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      analysis.addBlock("", block);
      analysis.addBlock("a", aBlock);
      let element = analysis.startElement({ line: 10, column: 32 });
      let klass = block.getClass("pretty") as BlockClass;
      let state = klass.resolveAttributeValue("[color=yellow]");
      if (!state) { throw new Error("No state group `color` resolved"); }
      element.addStaticClass(klass);
      element.addStaticAttr(klass, state);
      analysis.endElement(element);
      assert.deepEqual(1, 1);
    });
  }
}
