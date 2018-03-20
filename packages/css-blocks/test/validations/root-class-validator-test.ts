import { Template } from "@opticss/template-api";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block } from "../../src/Block";
import { BlockFactory } from "../../src/BlockParser";
import { SerializedTemplateAnalysis, TemplateAnalysis } from "../../src/TemplateAnalysis";
import { Options, resolveConfiguration } from "../../src/configuration";
import * as cssBlocks from "../../src/errors";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("Root Class Validator")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  @test "adding both root and a class from the same block to the same elment throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let options = {};

    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      "Cannot put block classes on the block's root element (templates/my-template.hbs:10:32)",
      this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]): [Block, postcss.Container] => {
        analysis.blocks[""] = block;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(block.getClass("fdsa")!);
        analysis.endElement(element);
        return [block, _];
      }),
    );
  }

  @test "adding both root and an attribute from the same block to the same element is allowed"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let options = {};

    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]): [Block, postcss.Container] => {
      analysis.blocks[""] = block;
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[state|foo]")!);
      analysis.endElement(element);
      return [block, _];
    });
  }

  @test "classes from other blocks may be added to the root element"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options = { importer: imports.importer() };

    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let css = `
      @block-reference a from "a.css";
      :scope { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["a"] = aBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticClass(aBlock.getClass("foo")!);
      analysis.endElement(element);

      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: { "": "blocks/foo.block.css", "a": "blocks/a.css" },
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs" },
        stylesFound: [":scope", "a.foo"],
        elements: {
          a: {
            dynamicClasses: [],
            dynamicAttributes: [],
            sourceLocation: {
              start: {
                column: 32,
                filename: "templates/my-template.hbs",
                line: 10,
              },
            },
            staticStyles: [0, 1],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

}
