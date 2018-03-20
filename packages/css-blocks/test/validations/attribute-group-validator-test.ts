import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block } from "../../src/Block";
import { BlockFactory } from "../../src/BlockParser";
import { TemplateAnalysis } from "../../src/TemplateAnalysis";
import { normalizeOptions, Options } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("Attribute Group Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let options = normalizeOptions(opts);
    let factory = new BlockFactory(options, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "throws when two static attributes from the same group are applied"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let importer = imports.importer();
    let options = normalizeOptions({importer});

    let css = `
      :scope { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
        analysis.blocks[""] = block;
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
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let importer = imports.importer();
    let options = normalizeOptions({importer});

    let css = `
      :scope { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
        analysis.blocks[""] = block;
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
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let importer = imports.importer();
    let options = normalizeOptions({importer});

    let css = `
      :scope { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
        analysis.blocks[""] = block;
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
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let importer = imports.importer();
    let options = normalizeOptions({importer});

    let css = `
      :scope { color: blue; }
      [state|test=foo] { color: red; }
      [state|test=bar] { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Can not apply multiple states at the same time from the exclusive state group "[state|test]". (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.getAttribute("[state|test]")!, true);
        element.addDynamicGroup(block.rootClass, block.rootClass.getAttribute("[state|test]")!, true);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      }));
  }

}
