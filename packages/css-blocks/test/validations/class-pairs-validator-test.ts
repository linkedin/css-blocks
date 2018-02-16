import { Template } from "@opticss/template-api";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block, BlockClass, State } from "../../src/Block";
import { BlockFactory } from "../../src/BlockFactory";
import { BlockParser } from "../../src/BlockParser";
import { OptionsReader } from "../../src/OptionsReader";
import { TemplateAnalysis } from "../../src/TemplateAnalysis";
import * as cssBlocks from "../../src/errors";
import { PluginOptions } from "../../src/options";
import { assertParseError } from "../util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("Class Pairs Validator")
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

  @test "correlating two classes from the same block on the same element throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);

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
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `Classes "fdsa" and "asdf" from the same block are not allowed on the same element at the same time. (templates/my-template.hbs:10:11)`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 11 });
        element.addStaticClass(block.getClass("asdf")!);
        element.addStaticClass(block.getClass("fdsa")!);
        analysis.endElement(element);
      }),
    );
  }
}
