import { POSITION_UNKNOWN } from "@opticss/element-analysis";
import { SerializedTemplateAnalysis as SerializedOptimizedAnalysis, Template } from "@opticss/template-api";
import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { ElementAnalysis, SerializedAnalysis } from "../src/Analyzer";
import { BlockFactory } from "../src/BlockParser";
import { AttrValue, Attribute, Block, BlockClass } from "../src/BlockTree";
import { Options, resolveConfiguration } from "../src/configuration";
import * as cssBlocks from "../src/errors";

import { assertParseError } from "./util/assertError";
import { setupImporting } from "./util/setupImporting";
import { TestAnalyzer } from "./util/TestAnalyzer";

type TestElement = ElementAnalysis<null, null, null>;
type TemplateType = "Opticss.Template";

type BlockAndRoot = [Block, postcss.Container];

@suite("Template Analysis")
export class AnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "analysis"): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, {from: filename});
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  @test "can add styles from a block"() {
    let config = resolveConfiguration({});
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);
    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.rootClass);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope"],
        elements: {
          "a": {
            staticStyles: [ 0 ],
            dynamicClasses: [ ],
            dynamicAttributes: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can add dynamic styles from a block"() {
    let config = resolveConfiguration({});
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);
    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN, "div");
      element.addDynamicClasses({condition: null, whenTrue: [block.rootClass]});
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope"],
        elements: {
          a: {
            tagName: "div",
            staticStyles: [ ],
            dynamicClasses: [ { condition: true, whenTrue: [0]} ],
            dynamicAttributes: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "can correlate styles"() {
    let config = resolveConfiguration({});
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);
    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let element = analysis.startElement(POSITION_UNKNOWN);
      let klass = block.getClass("asdf");
      if (klass) {
        element.addStaticClass(klass);
        let state = klass.getAttributeValue("[larger]");
        if (state) {
          element.addStaticAttr(klass, state);
        }
      }
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[larger]"],
        elements: {
          "a": {
            staticStyles: [ 0, 1 ],
            dynamicClasses: [ ],
            dynamicAttributes: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @skip
  @test "uncomment"() {}
  @test "can add styles from two blocks"() {
    let config = resolveConfiguration({});
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);
    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block1, _]) => {
      analysis.addBlock("", block1);
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block1.rootClass);
      analysis.endElement(element);
      return this.parseBlock(`:scope { border: 1px solid black; }`, "blocks/bar.block.css").then(([block2, _]) => {
        analysis.addBlock("ref", block2);
        let element = analysis.startElement(POSITION_UNKNOWN);
        element.addStaticClass(block2.rootClass);
        analysis.endElement(element);
        let result = analysis.serialize();
        let expectedResult: SerializedAnalysis<TemplateType> = {
          blocks: {"": "blocks/foo.block.css", "ref": "blocks/bar.block.css"},
          elements: {
            a: {
              staticStyles: [ 0 ],
              dynamicClasses: [ ],
              dynamicAttributes: [ ],
            },
            b: {
              staticStyles: [ 1 ],
              dynamicClasses: [ ],
              dynamicAttributes: [ ],
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
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let css = `
      @block a from "a.css";

      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = block.getClass("asdf") as BlockClass;
      element.addStaticClass(klass);
      element.addDynamicClasses({ condition: null, whenTrue: [aBlock.getClass("foo")!] });
      element.addDynamicAttr(klass, klass.getAttributeValue("[larger]")!, null);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[larger]", "a.foo"],
        elements: {
          a: {
            staticStyles: [0],
            dynamicClasses: [
              { condition: true, whenTrue: [ 2 ]},
            ],
            dynamicAttributes: [
              { condition: true, value: [ 1 ] },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple dynamic values added using `addExclusiveStyles` enumerate correlations correctly in analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope[color]   { color: red; }
      :scope[bgcolor] { color: red; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element: TestElement = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({condition: null, whenTrue: [block.rootClass]});
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveAttribute("[color]") as Attribute, null);
        element.addDynamicAttr(block.rootClass, block.rootClass.getAttributeValue("[bgcolor]")!, null);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedAnalysis<TemplateType> = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [":scope", ":scope[bgcolor]", ":scope[color]"],
          elements: {
            a: {
              sourceLocation: { start: { filename: "templates/my-template.hbs", line: 10, column: 32 } },
              staticStyles: [ ],
              dynamicClasses: [ {condition: true, whenTrue: [ 0 ] } ],
              dynamicAttributes: [
                { stringExpression: true, group: {"::attr-present": 2 }, container: 0, value: [] },
                { condition: true, value: [ 1 ], container: 0 },
              ],
            },
          },
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple exclusive dynamic values added using enumerate correlations correctly in analysis"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope[color=red]    { color: red; }
      :scope[color=blue]   { color: blue; }
      :scope[bgcolor=red]  { color: red; }
      :scope[bgcolor=blue] { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.addBlock("", block);
        let element: TestElement = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveAttribute("[color]") as Attribute, null);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveAttribute("[bgcolor]") as Attribute, null, true);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedAnalysis<TemplateType> = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
          stylesFound: [
            ":scope",
            ":scope[bgcolor=blue]",
            ":scope[bgcolor=red]",
            ":scope[color=blue]",
            ":scope[color=red]",
          ],
          elements: {
            "a": {
              "sourceLocation": {
                "start": { filename: "templates/my-template.hbs", "column": 32, "line": 10 },
              },
              "staticStyles": [ 0 ],
              "dynamicClasses": [],
              "dynamicAttributes": [
                {
                  "stringExpression": true,
                  "group": {
                    "blue": 3,
                    "red": 4,
                  },
                  "value": [],
                },
                {
                  "stringExpression": true,
                  "disallowFalsy": true,
                  "group": {
                    "blue": 1,
                    "red": 2,
                  },
                  "value": [],
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
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let css = `
      @block a from "a.css";

      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let asdf = block.getClass("asdf")!;
      let fdsa = block.getClass("fdsa")!;
      let foo = aBlock.getClass("foo")!;
      element.addDynamicClasses({condition: null, whenTrue: [asdf], whenFalse: [fdsa, foo]});
      // This is what we do when the same state is in the template for two
      // classes that have the states of the same name.
      element.addStaticAttr(asdf, asdf.getAttributeValue("[larger]")!);
      element.addStaticAttr(fdsa, fdsa.getAttributeValue("[larger]")!);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[larger]", ".fdsa", ".fdsa[larger]", "a.foo"],
        elements: {
          a: {
            staticStyles: [ ],
            dynamicClasses: [ {condition: true, whenTrue: [ 0 ], whenFalse: [ 2, 4 ] } ],
            dynamicAttributes: [
              { value: [ 1 ], container: 0 },
              { value: [ 3 ], container: 2 },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is true"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[bar] { font-size: 26px; }
      `,
    );

    let css = `
      @block a from "a.css";

      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: resolve('a.foo[bar]'); font-size: 20px; }
      .fdsa { font-size: resolve('a.foo[bar]'); font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = aBlock.getClass("foo")!;
      element.addStaticClass(klass);
      element.addDynamicClasses({
        condition: null,
        whenTrue: [block.getClass("asdf")!],
        whenFalse: [block.getClass("fdsa")!],
      });
      element.addStaticAttr(klass, klass.getAttributeValue("[bar]")!);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".fdsa", "a.foo", "a.foo[bar]"],
        elements: {
          a: {
            staticStyles: [ 2, 3 ],
            dynamicClasses: [ {condition: true, whenTrue: [ 0 ], whenFalse: [ 1 ] } ],
            dynamicAttributes: [ ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is false"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[bar] { font-size: 26px; }
      `,
    );

    let css = `
      @block a from "a.css";

      :scope { color: blue; }
      :scope[foo=red] { color: red; }
      :scope[foo=purple] { color: purple; }
      .asdf { font-size: 20px; }
      .fdsa { font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
      analysis.addBlock("", block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.rootClass);
      element.addDynamicGroup(block.rootClass, block.rootClass.resolveAttribute("[foo]") as Attribute, null, true);
      analysis.endElement(element);
      let result = analysis.serialize();
      let expectedResult: SerializedAnalysis<TemplateType> = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
        stylesFound: [":scope", ":scope[foo=purple]", ":scope[foo=red]"],
        elements: {
          a: {
            staticStyles: [ 0 ],
            dynamicClasses: [ ],

            dynamicAttributes: [
              { stringExpression: true, group: {"red": 2, "purple": 1}, disallowFalsy: true, value: [] },
            ],
          },
        },
      };
      assert.deepEqual(result, expectedResult);
    });
  }
  @test "can generate an analysis for the optimizer"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();
    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }
       .foo[bar] { font-size: 26px; }
      `,
    );

    let css = `
      @block a from "a.css";

      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: resolve('a.foo[bar]'); font-size: 20px; }
      .fdsa { font-size: 22px; font-size: resolve('a.foo[bar]'); }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config, "main").then(([block, _]) => {
      analysis.addBlock("", block);
      let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      let klass = aBlock.getClass("foo") as BlockClass;
      element.addStaticClass(klass);
      element.addDynamicClasses({condition: null, whenTrue: [block.getClass("asdf")!], whenFalse: [block.getClass("fdsa")!]});
      element.addStaticAttr(klass, klass.getAttributeValue("[bar]")!);
      analysis.endElement(element);
      let optimizerAnalysis = analysis.forOptimizer(config);
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
    let config = resolveConfiguration({});
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);

    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `Classes "fdsa" and "asdf" from the same block are not allowed on the same element at the same time. (templates/my-template.hbs:10:11)`,
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          analysis.addBlock("", block);
          let element = analysis.startElement({ line: 10, column: 11});
          element.addStaticClass(block.getClass("asdf")!);
          element.addStaticClass(block.getClass("fdsa")!);
          analysis.endElement(element);
      }),
    );
  }

  @test "built-in template validators may be configured with boolean values"() {
    let info = new Template("templates/my-template.hbs");
    let config = resolveConfiguration({});
    let blockFactory = new BlockFactory(config);
    let analyzer = new TestAnalyzer(blockFactory, { validations: { "no-class-pairs": false }});
    let analysis = analyzer.newAnalysis(info);

    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          analysis.addBlock("", block);
          let element = analysis.startElement(POSITION_UNKNOWN);
          element.addStaticClass(block.getClass("asdf")!);
          element.addStaticClass(block.getClass("fdsa")!);
          analysis.endElement(element);
      });
  }

  @test "custom template validators may be passed to analysis"() {
    let info = new Template("templates/my-template.hbs");
    let config = resolveConfiguration({});
    let analyzer = new TestAnalyzer(new BlockFactory(config), { validations: { customValidator(data, _a, err) { if (data) err("CUSTOM ERROR"); } } });
    let analysis = analyzer.newAnalysis(info);

    let css = `
      :scope { color: blue; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      "CUSTOM ERROR (templates/my-template.hbs:1:2)",
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          analysis.addBlock("", block);
          let element = analysis.startElement({ line: 1, column: 2 });
          analysis.endElement(element);
      }),
    );
  }

  @test "adding both root and a class from the same block to the same elment throws an error"() {
    let info = new Template("templates/my-template.hbs");
    let config = resolveConfiguration({});
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);

    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `Cannot put Block classes on the Block's root element. (templates/my-template.hbs:10:32)`,
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]): [Block, postcss.Container] => {
          analysis.addBlock("", block);
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
    let config = resolveConfiguration({});
    let analyzer = new TestAnalyzer(new BlockFactory(config));
    let analysis = analyzer.newAnalysis(info);

    let css = `
      :scope { color: blue; }
      :scope[foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]): [Block, postcss.Container] => {
          analysis.addBlock("", block);
          let element = analysis.startElement({ line: 10, column: 32 });
          element.addStaticClass(block.rootClass);
          element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[foo]")!);
          analysis.endElement(element);
          return [block, _];
      });
  }

  @test "classes from other blocks may be added to the root element"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; }`,
    );

    let css = `
      @block a from "a.css";
      :scope { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
        analysis.addBlock("", block);
        analysis.addBlock("a", aBlock);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(aBlock.getClass("foo")!);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedAnalysis<TemplateType> = {
          blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
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
              staticStyles: [ 0, 1 ],
            },
          },
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      :scope { color: blue; }
      :scope[test] { color: red; }
    `;
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ":scope[test]" without parent block also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          analysis.addBlock("", block);
          let element = analysis.startElement({ line: 10, column: 32 });
          element.addStaticAttr(block.rootClass, block.rootClass.getAttributeValue("[test]")!);
          analysis.endElement(element);
          assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { config } = setupImporting();

    let css = `
      .foo { color: blue; }
      .foo[test] { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".foo[test]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          analysis.addBlock("", block);
          let element = analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass("foo") as BlockClass;
          element.addStaticAttr(klass, klass.getAttributeValue("[test]")!);
          analysis.endElement(element);
          assert.deepEqual(1, 1);
    }));

  }

  @test "Throws when inherited states are applied without their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[color=yellow] {
        color: yellow;
      }
      .pretty[color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[color=black] {
        color: black;
      }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      'Cannot use state ".pretty[color=yellow]" without parent class also applied or implied by another style. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
          analysis.addBlock("", block);
          analysis.addBlock("a", aBlock);
          let element = analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass("pretty") as BlockClass;
          let state = klass.resolveAttributeValue("[color=yellow]")!;
          element.addStaticAttr(klass, state);
          analysis.endElement(element);
          assert.deepEqual(1, 1);
    }));
  }

  @test "Inherited states pass validation when applied with their root"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `:scope { color: blue; }
      .pretty { color: red; }
      .pretty[color=yellow] {
        color: yellow;
      }
      .pretty[color=green] {
        color: green;
      }`,
    );

    let css = `
      @block a from "a.css";
      :scope { extends: a; }
      .pretty[color=black] {
        color: black;
      }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
          let aBlock = analysis.addBlock("a", block.getReferencedBlock("a") as Block);
          analysis.addBlock("", block);
          analysis.addBlock("a", aBlock);
          let element = analysis.startElement({ line: 10, column: 32 });

          let klass = block.getClass("pretty") as BlockClass;
          let state = klass.resolveAttributeValue("[color=yellow]") as AttrValue;
          element.addStaticClass(klass);
          element.addStaticAttr(klass, state);
          analysis.endElement(element);
          assert.deepEqual(1, 1);
    });
  }

  @test "composition test"() {
    let info = new Template("templates/my-template.hbs");
    let analyzer = new TestAnalyzer(new BlockFactory({}));
    let analysis = analyzer.newAnalysis(info);
    let { imports, config } = setupImporting();

    imports.registerSource(
      "blocks/a.css",
      `.foo { border: 3px; } .bar { border: 4px; }`,
    );

    let css = `
      @block a from "a.css";
      :scope { composes: a.foo; color: blue; }
      :scope[active] { composes: a.bar; color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", config).then(([block, _]) => {
        analysis.addBlock("", block);
        analysis.addBlock("a", block.getReferencedBlock("a") as Block);
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        analysis.endElement(element);

        let result = analysis.serialize();
        let expectedResult: SerializedAnalysis<TemplateType> = {
          blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
          template: { type: "Opticss.Template", identifier: "templates/my-template.hbs"},
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
              staticStyles: [ 0, 1 ],
            },
          },
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  /*
  @test "analysis can be serialized and deserialized"() {
    let source = `
      :scope {}
      .myclass {}
      :scope[a-state] {}
      .myclass[a-sub-state] {}
    `;
    let processPromise = postcss().process(source, {from: "test.css"});
    let registry = new MockImportRegistry();
    registry.registerSource("test.css", source);
    let testImporter = registry.importer();
    let config = resolveConfiguration({
      importer: testImporter
    });
    let factory = new BlockFactory(config, postcss);
    let blockPromise = <Promise<Block>>processPromise.then(result => {
      if (result.root) {
        let parser = new BlockParser(config, factory);
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
      let analyzer = new TestAnalyzer();
      let analysis = analyzer.newAnalysis(template);
      analysis.blocks["a"] = block;
      let element: TestElement = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.find(":scope") as Block);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(block.find(".myclass") as BlockClass);
      element.addDynamicState(block.find(".myclass[a-sub-state]") as State, null);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addDynamicClasses({condition: null, whenTrue: [block.find(".myclass") as BlockClass]});
      element.addStaticState(block.find(".myclass[a-sub-state]") as State);
      analysis.endElement(element);
      element = analysis.startElement(POSITION_UNKNOWN);
      element.addDynamicClasses({condition: null, whenFalse: [block.find(".myclass") as BlockClass]});
      element.addStaticState(block.find(".myclass[a-sub-state]") as State);
      analysis.endElement(element);
      return analysis;
    });
    let testPromise = analysisPromise.then(analysis => {
      let serialization = analysis.serialize();
      assert.deepEqual(serialization.template, {type: "Opticss.Template", identifier: "my-template.html"});
      let factory = new BlockFactory(config, postcss);
      return Analysis.deserialize<"Opticss.Template">(serialization, factory).then(analysis => {
        let reserialization = analysis.serialize();
        assert.deepEqual(serialization, reserialization);
      });
    });
    return testPromise;
  }
  */
}
