import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block } from "../../src/Block";
import { BlockFactory } from "../../src/BlockFactory";
import { BlockParser } from "../../src/BlockParser";
import { OptionsReader } from "../../src/OptionsReader";
import { TemplateAnalysis } from "../../src/TemplateAnalysis";
import * as cssBlocks from "../../src/errors";
import { PluginOptions } from "../../src/options";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("State Group Validator")
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

  @test "throws when two static states from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticState(block.rootClass, block.rootClass.getState("test", "foo")!);
        element.addStaticState(block.rootClass, block.rootClass.getState("test", "bar")!);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when static and dynamic states from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticState(block.rootClass, block.rootClass.getState("test", "foo")!);
        element.addDynamicState(block.rootClass, block.rootClass.getState("test", "bar")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when static state and dynamic group from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticState(block.rootClass, block.rootClass.getState("test", "foo")!);
        element.addDynamicGroup(block.rootClass, block.rootClass.getGroup("test")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

  @test "throws when duplicate dynamic groups are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.getGroup("test")!, true);
        element.addDynamicGroup(block.rootClass, block.rootClass.getGroup("test")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

}
