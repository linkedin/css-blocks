import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block, BlockClass } from "../../src/Block";
import { BlockFactory } from "../../src/BlockParser";
import { TemplateAnalysis } from "../../src/TemplateAnalysis";
import { normalizeOptions, Options } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("State Parent Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let options = normalizeOptions(opts);
    let factory = new BlockFactory(options, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options = normalizeOptions({ importer: imports.importer() });

    let css = `
      :scope { color: blue; }
      [state|test] { color: red; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state "[state|test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|test]")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options = normalizeOptions({ importer: imports.importer() });

    let css = `
      .foo { color: blue; }
      .foo[state|test] { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[state|test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
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
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options = normalizeOptions({ importer: imports.importer() });

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
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
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
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options = normalizeOptions({ importer: imports.importer() });

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

    return this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
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
