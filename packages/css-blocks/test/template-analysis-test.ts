import { POSITION_UNKNOWN } from "@opticss/element-analysis";
import { SerializedTemplateAnalysis as SerializedOptimizedAnalysis, Template } from "@opticss/template-api";
import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Block, BlockClass, State, StateGroup } from "../src/Block";
import { BlockFactory } from "../src/BlockFactory";
import { BlockParser } from "../src/BlockParser";
import { OptionsReader } from "../src/OptionsReader";
import { ElementAnalysis, SerializedTemplateAnalysis, TemplateAnalysis } from "../src/TemplateAnalysis";
import * as cssBlocks from "../src/errors";
import { PluginOptions } from "../src/options";

import { MockImportRegistry } from "./util/MockImportRegistry";
import { assertParseError } from "./util/assertError";

type TestElement = ElementAnalysis<null, null, null>;

type BlockAndRoot = [Block, postcss.Container];

@suite("Template Analysis")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions, blockName = "analysis"): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);
    let blockParser = new BlockParser(options, factory);
    let root = postcss.parse(css, {from: filename});
    return blockParser.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  @test "can add styles from a block"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.rootClass);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope"],
        elements: {
          "a": {
            staticStyles: [ 0 ],
            dynamicClasses: [ ],
            dynamicStates: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can add dynamic styles from a block"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN, "div");
      element.addDynamicClasses({condition: null, whenTrue: [block.rootClass]});
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope"],
        elements: {
          a: {
            tagName: "div",
            staticStyles: [ ],
            dynamicClasses: [ { condition: true, whenTrue: [0]} ],
            dynamicStates: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "can correlate styles"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element = analysis.startElement(POSITION_UNKNOWN);
      let klass = block.getClass("asdf");
      if (klass) {
        element.addStaticClass(klass);
        let state = klass.getState("larger");
        if (state) {
          element.addStaticState(klass, state);
        }
      }
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]"],
        elements: {
          "a": {
            staticStyles: [ 0, 1 ],
            dynamicClasses: [ ],
            dynamicStates: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @skip
  @test "uncomment"() {}
  @test "can add styles from two blocks"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block1, _]) => {
      analysis.blocks[""] = block1;
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block1.rootClass);
      analysis.endElement(element);
      return this.parseBlock(`:scope { border: 1px solid black; }`, "blocks/bar.block.css").then(([block2, _]) => {
        analysis.blocks["ref"] = block2;
        let element = analysis.startElement(POSITION_UNKNOWN);
        element.addStaticClass(block2.rootClass);
        analysis.endElement(element);
        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
          blocks: {"": "blocks/foo.block.css", "ref": "blocks/bar.block.css"},
          elements: {
            a: {
              staticStyles: [ 0 ],
              dynamicClasses: [ ],
              dynamicStates: [ ],
            },
            b: {
              staticStyles: [ 1 ],
              dynamicClasses: [ ],
              dynamicStates: [ ],
            },
          },
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [":scope", "ref:scope"],
        };
        assert.deepEqual(result, expectedResult);
      });
    });
  }

  @test "adding dynamic styles enumerates correlation in analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = block.getClass("asdf") as BlockClass;
      element.addStaticClass(klass);
      element.addDynamicClasses({ condition: null, whenTrue: [aBlock.getClass("foo")!] });
      element.addDynamicState(klass, klass.getState("larger")!, null);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]", "a.foo"],
        elements: {
          a: {
            staticStyles: [0],
            dynamicClasses: [
              { condition: true, whenTrue: [ 2 ]},
            ],
            dynamicStates: [
              { condition: true, state: 1 },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple dynamic values added using `addExclusiveStyles` enumerate correlations correctly in analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      [state|color]   { color: red; }
      [state|bgcolor] { color: red; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element: TestElement = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({condition: null, whenTrue: [block.rootClass]});
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup("color") as StateGroup, null);
        element.addDynamicState(block.rootClass, block.rootClass.getState("bgcolor")!, null);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [":scope", "[state|bgcolor]", "[state|color]"],
          elements: {
            a: {
              sourceLocation: { start: { filename: "templates/my-template.hbs", line: 10, column: 32 } },
              staticStyles: [ ],
              dynamicClasses: [ {condition: true, whenTrue: [ 0 ] } ],
              dynamicStates: [
                { stringExpression: true, group: {"::universal": 2 }, container: 0 },
                { condition: true, state: 1, container: 0 },
              ],
            },
          },
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple exclusive dynamic values added using enumerate correlations correctly in analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      [state|color=red]    { color: red; }
      [state|color=blue]   { color: blue; }
      [state|bgcolor=red]  { color: red; }
      [state|bgcolor=blue] { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        analysis.blocks[""] = block;
        let element: TestElement = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup("color") as StateGroup, null);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup("bgcolor") as StateGroup, null, true);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [
            ":scope",
            "[state|bgcolor=blue]",
            "[state|bgcolor=red]",
            "[state|color=blue]",
            "[state|color=red]",
          ],
          elements: {
            "a": {
              "sourceLocation": {
                "start": { filename: "templates/my-template.hbs", "column": 32, "line": 10 },
              },
              "staticStyles": [ 0 ],
              "dynamicClasses": [],
              "dynamicStates": [
                {
                  "stringExpression": true,
                  "group": {
                    "blue": 3,
                    "red": 4,
                  },
                },
                {
                  "stringExpression": true,
                  "disallowFalsy": true,
                  "group": {
                    "blue": 1,
                    "red": 2,
                  },
                },
              ],
            },
          },
        };

        assert.deepEqual(result, expectedResult);
    });
  }

  @test "toggling between two classes with states of the same name"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let asdf = block.getClass("asdf")!;
      let fdsa = block.getClass("fdsa")!;
      let foo = aBlock.getClass("foo")!;
      element.addDynamicClasses({condition: null, whenTrue: [asdf], whenFalse: [fdsa, foo]});
      // This is what we do when the same state is in the template for two
      // classes that have the states of the same name.
      element.addStaticState(asdf, asdf.getState("larger")!);
      element.addStaticState(fdsa, fdsa.getState("larger")!);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]", ".fdsa", ".fdsa[state|larger]", "a.foo"],
        elements: {
          a: {
            staticStyles: [ ],
            dynamicClasses: [ {condition: true, whenTrue: [ 0 ], whenFalse: [ 2, 4 ] } ],
            dynamicStates: [
              { state: 1, container: 0 },
              { state: 3, container: 2 },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is true"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[state|bar] { font-size: 26px; }
      `,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: resolve('a.foo[state|bar]'); font-size: 20px; }
      .fdsa { font-size: resolve('a.foo[state|bar]'); font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = aBlock.getClass("foo")!;
      element.addStaticClass(klass);
      element.addDynamicClasses({
        condition: null,
        whenTrue: [block.getClass("asdf")!],
        whenFalse: [block.getClass("fdsa")!],
      });
      element.addStaticState(klass, klass.getState("bar")!);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".fdsa", "a.foo", "a.foo[state|bar]"],
        elements: {
          a: {
            staticStyles: [ 2, 3 ],
            dynamicClasses: [ {condition: true, whenTrue: [ 0 ], whenFalse: [ 1 ] } ],
            dynamicStates: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is false"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[state|bar] { font-size: 26px; }
      `,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      :scope { color: blue; }
      [state|foo=red] { color: red; }
      [state|foo=purple] { color: purple; }
      .asdf { font-size: 20px; }
      .fdsa { font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.rootClass);
      element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup("foo") as StateGroup, null, true);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope", "[state|foo=purple]", "[state|foo=red]"],
        elements: {
          a: {
            staticStyles: [ 0 ],
            dynamicClasses: [ ],

            dynamicStates: [
              { stringExpression: true, group: {"red": 2, "purple": 1}, disallowFalsy: true },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can generate an analysis for the optimizer"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[state|bar] { font-size: 26px; }
      `,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: resolve('a.foo[state|bar]'); font-size: 20px; }
      .fdsa { font-size: 22px; font-size: resolve('a.foo[state|bar]'); }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader, "main").then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = aBlock.getClass("foo") as BlockClass;
      element.addStaticClass(klass);
      element.addDynamicClasses({condition: null, whenTrue: [block.getClass("asdf")!], whenFalse: [block.getClass("fdsa")!]});
      element.addStaticState(klass, klass.getState("bar")!);
      analysis.endElement(element);
      let options: PluginOptions = {};
      let reader = new OptionsReader(options);
      let optimizerAnalysis = analysis.forOptimizer(reader);
      let result = optimizerAnalysis.serialize();
      let expectedResult: SerializedOptimizedAnalysis<"Opticss.Template"> = {
        template: {
          type: "Opticss.Template",
          identifier: "templates/my-template.hbs",
        },
        elements: [
          {
            "attributes": [
              {
                "name": "class",
                "value": {
                  "allOf": [
                    {
                      "constant": "a__foo",
                    },
                    {
                      "constant": "a__foo--bar",
                    },
                    {
                      "oneOf": [
                        {
                          "constant": "main__asdf",
                        },
                        {
                          "constant": "main__fdsa",
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            "tagname": {
              "value": {
                "unknown": true,
              },
            },
          },
        ],
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "correlating two classes from the same block on the same element throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

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
      `Classes "fdsa" and "asdf" from the same block are not allowed on the same element at the same time. (templates/my-template.hbs:10:11)`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          let element = analysis.startElement({ line: 10, column: 11});
          element.addStaticClass(block.getClass("asdf")!);
          element.addStaticClass(block.getClass("fdsa")!);
          analysis.endElement(element);
      }),
    );
  }

  @test "built-in template validators may be configured with boolean values"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info, { "no-class-pairs": false });

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          let element = analysis.startElement(POSITION_UNKNOWN);
          element.addStaticClass(block.getClass("asdf")!);
          element.addStaticClass(block.getClass("fdsa")!);
          analysis.endElement(element);
      });
  }

  @test "custom template validators may be passed to analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info, { customValidator(data, _a, err) { if (data) err("CUSTOM ERROR"); } });

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

    let css = `
      :scope { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      "CUSTOM ERROR (templates/my-template.hbs:1:2)",
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          let element = analysis.startElement({ line: 1, column: 2 });
          analysis.endElement(element);
      }),
    );
  }

  @test "adding both root and a class from the same block to the same elment throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

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
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]): [Block, postcss.Container] => {
          analysis.blocks[""] = block;
          let element = analysis.startElement({ line: 10, column: 32 });
          element.addStaticClass(block.rootClass);
          element.addStaticClass(block.getClass("fdsa")!);
          analysis.endElement(element);
          return [block, _];
      }),
    );
  }

  @test "adding both root and a state from the same block to the same element is allowed"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);

    let options: PluginOptions = {};
    let reader = new OptionsReader(options);

    let css = `
      :scope { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]): [Block, postcss.Container] => {
          analysis.blocks[""] = block;
          let element = analysis.startElement({ line: 10, column: 32 });
          element.addStaticClass(block.rootClass);
          element.addStaticState(block.rootClass, block.rootClass.getState("foo")!);
          analysis.endElement(element);
          return [block, _];
      });
  }

  @test "classes from other blocks may be added to the root element"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";
      :scope { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["a"] = aBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(aBlock.getClass("foo")!);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis<"Opticss.Template"> = {
          blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [":scope", "a.foo"],
          elements: {
            a: {
              dynamicClasses: [],
              dynamicStates: [],
              sourceLocation: {
                start: {
                  column: 32,
                  filename: "templates/my-template.hbs",
                  line: 10,
                },
              },
              staticStyles: [ 0, 1 ],
            },
          },
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      :scope { color: blue; }
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
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
          analysis.blocks[""] = block;
          analysis.blocks["a"] = aBlock;
          let element = analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass("pretty") as BlockClass;
          let state = klass.resolveState("color", "yellow")!;
          element.addStaticState(klass, state);
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

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
          analysis.blocks[""] = block;
          analysis.blocks["a"] = aBlock;
          let element = analysis.startElement({ line: 10, column: 32 });

          let klass = block.getClass("pretty") as BlockClass;
          let state = klass.resolveState("color", "yellow") as State;
          element.addStaticClass(klass);
          element.addStaticState(klass, state);
          analysis.endElement(element);
          assert.deepEqual(1, 1);
    });
  }

  /*
  @test "analysis can be serialized and deserialized"() {
    let source = `
      :scope {}
      .myclass {}
      [state|a-state] {}
      .myclass[state|a-sub-state] {}
    `;
    let processPromise = postcss().process(source, {from: "test.css"});
    let registry = new MockImportRegistry();
    registry.registerSource("test.css", source);
    let testImporter = registry.importer();
    let options: PluginOptions =  {
      importer: testImporter
    };
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);
    let blockPromise = <Promise<Block>>processPromise.then(result => {
      if (result.root) {
        let parser = new BlockParser(options, factory);
        try {
          return parser.parse(result.root, "test.css", "a-block");
        } catch (e) {
          console.error(e); throw e;
        }
      } else {
        throw new Error("wtf");
      }
    });
    let analysisPromise = blockPromise.then(block => {
      let template = new Template("my-template.html");
      let analysis = new TemplateAnalysis(template);
      analysis.blocks["a"] = block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.find(":scope") as Block);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.find(".myclass") as BlockClass);
      element.addDynamicState(block.find(".myclass[state|a-sub-state]") as State, null);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addDynamicClasses({condition: null, whenTrue: [block.find(".myclass") as BlockClass]});
      element.addStaticState(block.find(".myclass[state|a-sub-state]") as State);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addDynamicClasses({condition: null, whenFalse: [block.find(".myclass") as BlockClass]});
      element.addStaticState(block.find(".myclass[state|a-sub-state]") as State);
      analysis.endElement(element);
      return analysis;
    });
    let testPromise = analysisPromise.then(analysis => {
      let serialization = analysis.serialize();
      assert.deepEqual(serialization.template, {type: "Opticss.Template", identifier: "my-template.html"});
      let reader = new OptionsReader(options);
      let factory = new BlockFactory(reader, postcss);
      return TemplateAnalysis.deserialize<"Opticss.Template">(serialization, factory).then(analysis => {
        let reserialization = analysis.serialize();
        assert.deepEqual(serialization, reserialization);
      });
    });
    return testPromise;
  }
  */
}
