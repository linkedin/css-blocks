import { assert } from "chai";
import { suite, test, only, skip } from "mocha-typescript";
import * as postcss from "postcss";
import { TemplateInfo, Template, SerializedTemplateAnalysis as SerializedOptimizedAnalysis } from "@opticss/template-api";
import { POSITION_UNKNOWN } from "@opticss/element-analysis";

import * as cssBlocks from "../../src/errors";
import BlockParser from "../../src/BlockParser";
import { BlockFactory } from "../../src/BlockFactory";
import { Importer, ImportedFile } from "../../src/importing";
import { Block, BlockObject, BlockClass, State } from "../../src/Block";
import { PluginOptions } from "../../src/options";
import { OptionsReader } from "../../src/OptionsReader";
import { SerializedTemplateAnalysis, TemplateAnalysis, ElementAnalysis } from "../../src/TemplateAnalysis";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type TestElement = ElementAnalysis<null, null, null>;

type BlockAndRoot = [Block, postcss.Container];

@suite("Validators")
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

  @test "built-in template validators may be configured with boolean values"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info, { "no-class-pairs": false });
    let imports = new MockImportRegistry();

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.getClass('asdf')!);
      element.addStaticClass(block.getClass('fdsa')!);
      analysis.endElement(element);
    });
  }

  @test "custom template validators may be passed to analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info, { customValidator(data, _a, err) { if (data) err('CUSTOM ERROR'); } });
    let imports = new MockImportRegistry();

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      "CUSTOM ERROR (templates/my-template.hbs:1:2)",
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 1, column: 2 });
        analysis.endElement(element);
      })
    );
  }

}
