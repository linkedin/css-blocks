import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import BlockParser from "../src/BlockParser";
import { Block } from "../src/Block";
import { PluginOptions, OptionsReader } from "../src/options";
import { SerializedTemplateAnalysis, TemplateInfo, TemplateAnalysis } from "../src/TemplateAnalysis";

type BlockAndRoot = [Block, postcss.Container];

@suite("Template Analysis")
export class KeyQueryTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions): Promise<BlockAndRoot> {
    let blockParser = new BlockParser(postcss, opts);
    let root = postcss.parse(css, {from: filename});
    return blockParser.parse(root, filename, "query-test").then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  @test "can add styles from a block"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      analysis.startElement();
      analysis.addStyle(block);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".root"],
        dynamicStyles: [],
        styleCorrelations: []
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can add dynamic styles from a block"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      analysis.startElement();
      analysis.addStyle(block);
      analysis.markDynamic(block);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".root"],
        dynamicStyles: [0],
        styleCorrelations: []
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can correlate styles"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      analysis.startElement();
      let klass = block.getClass("asdf");
      if (klass) {
        analysis.addStyle(klass);
        let state = klass.states.getState("larger");
        if (state) {
          analysis.addStyle(state);
        }
      }
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]"],
        dynamicStyles: [],
        styleCorrelations: [[0, 1]]
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can add styles from two blocks"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block1, _]) => {
      analysis.blocks[""] = block1;
      analysis.startElement();
      analysis.addStyle(block1);
      analysis.endElement();
      return this.parseBlock(`.root { border: 1px solid black; }`, "blocks/bar.block.css").then(([block2, _]) => {
        analysis.blocks["ref"] = block2;
        analysis.startElement();
        analysis.addStyle(block2);
        analysis.endElement();
        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis = {
          blocks: {"": "blocks/foo.block.css", "ref": "blocks/bar.block.css"},
          template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
          stylesFound: [".root", "ref.root"],
          dynamicStyles: [],
          styleCorrelations: []
        };
        assert.deepEqual(result, expectedResult);
      });
    });
  }
}