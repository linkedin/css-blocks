import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Analysis } from "../../src/Analyzer";
import { BlockFactory } from "../../src/BlockParser";
import { Block, BlockClass } from "../../src/BlockTree";
import { Options, resolveConfiguration } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";

import { assertParseError } from "../util/assertError";
import { setupImporting } from "../util/setupImporting";

type BlockAndRoot = [Block, postcss.Container];

@suite("State Parent Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new Analysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      [state|test] { color: red; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state "[state|test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new Analysis(info);
    let { config } = setupImporting();

    let css = `
      .foo { color: blue; }
      .foo[state|test] { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[state|test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("foo") as BlockClass;
        element.addStaticAttr(klass, klass.getAttributeValue("[state|test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));

  }

  @test "Throws when inherited states are applied without their root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new Analysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
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
      @block-reference a from "a.css";
      :scope { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".pretty[state|color=yellow]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["a"] = aBlock;
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
    let analysis = new Analysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
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
      @block-reference a from "a.css";
      :scope { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["a"] = aBlock;
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
