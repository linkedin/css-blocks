import { POSITION_UNKNOWN } from "@opticss/element-analysis";
import { SerializedTemplateAnalysis as SerializedOptimizedAnalysis, Template, TemplateInfo } from "@opticss/template-api";
import { assert } from "chai";
import { only, skip, suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block, BlockClass, BlockObject, State } from "../../src/Block";
import { BlockFactory } from "../../src/BlockFactory";
import { BlockParser } from "../../src/BlockParser";
import { OptionsReader } from "../../src/OptionsReader";
import { ElementAnalysis, SerializedTemplateAnalysis, TemplateAnalysis } from "../../src/TemplateAnalysis";
import * as cssBlocks from "../../src/errors";
import { ImportedFile, Importer } from "../../src/importing";
import { PluginOptions } from "../../src/options";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type TestElement = ElementAnalysis<null, null, null>;

type BlockAndRoot = [Block, postcss.Container];

@suite("State Parent Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions, blockName = "analysis"): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);
    let blockParser = new BlockParser(options, factory);
    let root = postcss.parse(css, { from: filename });
    return blockParser.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|test] { color: red; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state "[state|test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticState(block.rootClass, block.rootClass.getState("test")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .foo { color: blue; }
      .foo[state|test] { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[state|test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("foo") as BlockClass;
        element.addStaticState(klass, klass.getState("test")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));

  }

  @test "Throws when inherited states are applied without their root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource(
      "blocks/a.css",
      `.root { color: blue; }
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
      .root { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".pretty[state|color=yellow]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["a"] = aBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        let klass = block.getClass("pretty") as BlockClass;
        let group = klass.resolveGroup("color") as { [name: string]: State };
        element.addStaticState(klass, group["yellow"]);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "Inherited states pass validation when applied with their root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource(
      "blocks/a.css",
      `.root { color: blue; }
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
      .root { extends: a; }
      .pretty[state|color=black] {
        color: black;
      }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["a"] = aBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      let klass = block.getClass("pretty") as BlockClass;
      let group = klass.resolveGroup("color") as { [name: string]: State };
      element.addStaticClass(klass);
      element.addStaticState(klass, group["yellow"]);
      analysis.endElement(element);
      assert.deepEqual(1, 1);
    });
  }
}
