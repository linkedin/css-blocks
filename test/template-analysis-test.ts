import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";
import * as postcss from "postcss";

import * as cssBlocks from "../src/errors";
import BlockParser from "../src/BlockParser";
import { BlockFactory } from "../src/Block/BlockFactory";
import { Importer, ImportedFile } from "../src/importing";
import { Block, BlockObject, BlockClass, State } from "../src/Block";
import { PluginOptions } from "../src/options";
import { OptionsReader } from "../src/OptionsReader";
import { SerializedTemplateAnalysis, TemplateInfo, TemplateAnalysis } from "../src/TemplateAnalysis";
import { MockImportRegistry } from "./util/MockImportRegistry";
import { assertParseError } from "./util/assertError";

type BlockAndRoot = [Block, postcss.Container];

@suite("Template Analysis")
export class KeyQueryTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let factory = new BlockFactory(options, postcss);
    let blockParser = new BlockParser(postcss, options, factory);
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
      analysis.startElement({});
      analysis.addStyle(block);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".root"],
        elements: {
          "el_a": {
            correlations: [],
            dynamic: [],
            static: [ 0 ],
            loc: {}
          }
        }
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
      analysis.startElement({});
      analysis.addStyle(block, true);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".root"],
        elements: {
          el_a: {
            correlations: [],
            dynamic: [ 0 ],
            static: [ ],
            loc: {}
          }
        }
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
      analysis.startElement({});
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
        elements: {
          el_a: {
            correlations: [],
            dynamic: [],
            static: [ 0, 1 ],
            loc: {}
          }
        }
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
      analysis.startElement({});
      analysis.addStyle(block1);
      analysis.endElement();
      return this.parseBlock(`.root { border: 1px solid black; }`, "blocks/bar.block.css").then(([block2, _]) => {
        analysis.blocks["ref"] = block2;
        analysis.startElement({});
        analysis.addStyle(block2);
        analysis.endElement();
        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis = {
          blocks: {"": "blocks/foo.block.css", "ref": "blocks/bar.block.css"},
          elements: {
            el_a: {
              correlations: [],
              dynamic: [],
              static: [ 0 ],
              loc: {}
            },
            el_b: {
              correlations: [],
              dynamic: [],
              static: [ 1 ],
              loc: {}
            }
          },
          template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
          stylesFound: [".root", "ref.root"],
        };
        assert.deepEqual(result, expectedResult);
      });
    });
  }

  @test "adding dynamic styles enumerates correlation in analysis"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource("blocks/a.css",
      `.foo { border: 3px; }`
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.startElement({});
      let klass = block.getClass('asdf') as BlockClass;
      analysis.addStyle( klass, false );
      analysis.addStyle( klass.states.getState('larger') as State, true );
      analysis.addStyle( aBlock.getClass('foo') as BlockClass, true );
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]", "a.foo"],
        elements: {
          el_a: {
            correlations: [],
            dynamic: [ 1, 2],
            static: [ 0 ],
            loc: {}
          }
        }
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple dynamic values added using `addExclusiveStyles` enumerate correlations correctly in analysis"() {
    let info = new TemplateInfo("templates/my-template.hbs");
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
        analysis.startElement({ line: 10, column: 32 });
        analysis.addStyle(block);
        analysis.addExclusiveStyles( false, ...block.states.getGroup('color') );
        analysis.addExclusiveStyles( false, ...block.states.getGroup('bgcolor') );
        analysis.endElement();

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
          stylesFound: [".root", "[state|bgcolor]", "[state|color]"],
          elements: {
            el_a: {
              correlations: [ [ -1, 1], [-1, 2]],
              dynamic: [ ],
              static: [ 0 ],
              loc: {}
            }
          }
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "multiple exclusive dynamic values added using enumerate correlations correctly in analysis"() {
    let info = new TemplateInfo("templates/my-template.hbs");
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
        analysis.startElement({ line: 10, column: 32 });
        analysis.addStyle(block);
        analysis.addExclusiveStyles( false, ...block.states.getGroup('color') );
        analysis.addExclusiveStyles( false, ...block.states.getGroup('bgcolor') );
        analysis.endElement();

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis = {
          blocks: {"": "blocks/foo.block.css"},
          template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
          stylesFound: [".root", "[state|bgcolor=blue]", "[state|bgcolor=red]", "[state|color=blue]", "[state|color=red]"],
          elements: {
            el_a: {
              correlations: [ [ -1, 1, 2], [-1, 3, 4]],
              dynamic: [ ],
              static: [ 0 ],
              loc: {}
            }
          }
        };

        assert.deepEqual(result, expectedResult);
    });
  }

  @test "adding an array of non dynamic styles adds all styles to correlations"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource("blocks/a.css",
      `.foo { border: 3px; }`
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; }
      .fdsa { font-size: 20px; }
      .fdsa[state|larger] { font-size: 26px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.startElement({});
      let klass = block.getClass('asdf') as BlockClass;
      analysis.addStyle( klass, false );
      analysis.addExclusiveStyles(false, klass.states.getState('larger') as State, aBlock.getClass('foo') as BlockClass );
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".asdf[state|larger]", "a.foo"],
        elements: {
          el_a: {
            correlations: [ [ -1, 1, 2 ] ],
            dynamic: [ ],
            static: [ 0 ],
            loc: {}
          }
        }
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is true"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource("blocks/a.css",
      `.foo { border: 3px; }
       .foo[state|bar] { font-size: 26px; }
      `
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .fdsa { font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.startElement({});
      let klass = aBlock.getClass('foo') as BlockClass;
      analysis.addStyle( klass, false );
      analysis.addStyle( klass.states.getState('bar') as State, false );
      analysis.addExclusiveStyles(true, block.getClass('asdf') as BlockClass,  block.getClass('fdsa') as BlockClass);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".fdsa", "a.foo", "a.foo[state|bar]"],
        elements: {
          el_a: {
            correlations: [ [ 0, 1 ] ],
            dynamic: [ ],
            static: [ 2, 3 ],
            loc: {}
          }
        }
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "addExclusiveStyles generates correct correlations when `alwaysPresent` is false"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource("blocks/a.css",
      `.foo { border: 3px; }
       .foo[state|bar] { font-size: 26px; }
      `
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";

      .root { color: blue; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .fdsa { font-size: 22px; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
      analysis.startElement({});
      let klass = aBlock.getClass('foo') as BlockClass;
      analysis.addStyle( klass, false );
      analysis.addStyle( klass.states.getState('bar') as State, false );
      analysis.addExclusiveStyles(false, block.getClass('asdf') as BlockClass,  block.getClass('fdsa') as BlockClass);
      analysis.endElement();
      let result = analysis.serialize();
      let expectedResult: SerializedTemplateAnalysis = {
        blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
        template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
        stylesFound: [".asdf", ".fdsa", "a.foo", "a.foo[state|bar]"],
        elements: {
          el_a: {
            correlations: [ [ -1, 0, 1 ]],
            dynamic: [ ],
            static: [ 2, 3 ],
            loc: {}
          }
        }
      };
      assert.deepEqual(result, expectedResult);
    });
  }

  @test "correlating two classes from the same block on the same elment throws an error"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
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
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `Classes "fdsa" and "asdf" from the same block are not allowed on the same element. (templates/my-template.hbs:10:11)`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          analysis.startElement({ line: 10, column: 11});
          analysis.addStyle( block.getClass('asdf') as BlockClass, false );
          analysis.addStyle( block.getClass('fdsa') as BlockClass, false );
          analysis.endElement();
      })
    );
  }

  @test "built-in template validators may be configured with boolean values"() {
    let info = new TemplateInfo("templates/my-template.hbs");
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
          analysis.startElement({});
          analysis.addStyle( block.getClass('asdf') as BlockClass, false );
          analysis.addStyle( block.getClass('fdsa') as BlockClass, false );
          analysis.endElement();
      });
  }

  @test "custom template validators may be passed to analysis"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info, { customValidator(data, err){ if (data) err('CUSTOM ERROR'); } });
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
          analysis.startElement({ line: 1, column: 2 });
          analysis.endElement();
      })
    );
  }

  @test "adding both root and a class from the same block to the same elment throws an error"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
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
    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      "Cannot put block classes on the block's root element (templates/my-template.hbs:10:32)",
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]): [Block, postcss.Container] => {
          analysis.blocks[""] = block;
          analysis.startElement({ line: 10, column: 32 });
          analysis.addStyle( block as Block, false, );
          analysis.addStyle( block.getClass('fdsa') as BlockClass, false);
          analysis.endElement();
          return [block, _];
      })
    );
  }

  @test "adding both root and a state from the same block to the same elment is allowed"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
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
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]): [Block, postcss.Container] => {
          analysis.blocks[""] = block;
          analysis.startElement({ line: 10, column: 32 });
          analysis.addStyle( block as Block, false, );
          analysis.addStyle( block.states.getState("foo") as State, false);
          analysis.endElement();
          return [block, _];
      });
  }

  @test "classes from other blocks may be added to the root element"() {
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    imports.registerSource("blocks/a.css",
      `.foo { border: 3px; }`
    );

    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      @block-reference a from "a.css";
      .root { color: blue; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["a"] = aBlock;
        analysis.startElement({ line: 10, column: 32 });
        analysis.addStyle( block as Block, false, );
        analysis.addStyle( aBlock.getClass('foo') as BlockClass, false);
        analysis.endElement();

        let result = analysis.serialize();
        let expectedResult: SerializedTemplateAnalysis = {
          blocks: {"": "blocks/foo.block.css", "a": "blocks/a.css"},
          template: { type: TemplateInfo.typeName, identifier: "templates/my-template.hbs"},
          stylesFound: [".root", "a.foo"],
          elements: {
            el_a: {
              correlations: [ ],
              dynamic: [ ],
              static: [ 0, 1 ],
              loc: {}
            }
          }
        };
        assert.deepEqual(result, expectedResult);
    });
  }

  @test "throws when states are applied without their parent root"() {
    let info = new TemplateInfo("templates/my-template.hbs");
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
      'Cannot use state "[state|test]" without parent block also applied. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          analysis.startElement({ line: 10, column: 32 });
          analysis.addStyle( block.states.getState('test') as State, false);
          analysis.endElement();
          assert.deepEqual(1, 1);
      }));
  }

  @test "throws when states are applied without their parent BlockClass"() {
    let info = new TemplateInfo("templates/my-template.hbs");
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
      'Cannot use state ".foo[state|test]" without parent class also applied. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          analysis.blocks[""] = block;
          analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass('foo') as BlockClass;
          analysis.addStyle( klass.states.getState('test') as State, false);
          analysis.endElement();
          assert.deepEqual(1, 1);
    }));

  }

  @test 'Throws when inherited states are applied without their root'(){
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/a.css",
      `.root { color: blue; }
      .pretty { color: red; }
      .pretty[state|color=yellow] {
        color: yellow;
      }
      .pretty[state|color=green] {
        color: green;
      }`
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
      'Cannot use state ".pretty[state|color=yellow]" without parent class also applied. (templates/my-template.hbs:10:32)',
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
          let aBlock = analysis.blocks["a"] = block.getReferencedBlock("a") as Block;
          analysis.blocks[""] = block;
          analysis.blocks["a"] = aBlock;
          analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass('pretty') as BlockClass;
          let group = klass.states.resolveGroup('color') as {[name: string]: State};
          analysis.addStyle( group['yellow'], false);
          analysis.endElement();
          assert.deepEqual(1, 1);
    }));
  }

  @test 'Inherited states pass validation when applied with their root'(){
    let info = new TemplateInfo("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/a.css",
      `.root { color: blue; }
      .pretty { color: red; }
      .pretty[state|color=yellow] {
        color: yellow;
      }
      .pretty[state|color=green] {
        color: green;
      }`
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
          analysis.startElement({ line: 10, column: 32 });
          let klass = block.getClass('pretty') as BlockClass;
          let group = klass.states.resolveGroup('color') as {[name: string]: State};
          analysis.addStyle( klass, false);
          analysis.addStyle( group['yellow'], false);
          analysis.endElement();
          assert.deepEqual(1, 1);
    });
  }

  @test "analysis can be serialized and deserialized"() {
    let source = `
      .root {}
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
    let factory = new BlockFactory(options, postcss);
    let blockPromise = <Promise<Block>>processPromise.then(result => {
      if (result.root) {
        let parser = new BlockParser(postcss, options, factory);
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
      let template = new TemplateInfo("my-template.html");
      let analysis = new TemplateAnalysis(template);
      analysis.blocks["a"] = block;
      analysis.startElement({});
      analysis.addStyle(block.find(".root") as BlockObject);
      analysis.endElement();
      analysis.startElement({});
      analysis.addStyle(block.find(".myclass") as BlockObject, false);
      analysis.addStyle(block.find(".myclass[state|a-sub-state]") as BlockObject, true);
      analysis.endElement();
      analysis.startElement({});
      analysis.addExclusiveStyles(false, block.find(".myclass") as BlockObject, block.find(".myclass[state|a-sub-state]") as BlockObject);
      analysis.endElement();
      analysis.startElement({});
      analysis.addExclusiveStyles(true, block.find(".myclass") as BlockObject, block.find(".myclass[state|a-sub-state]") as BlockObject);
      analysis.endElement();
      return analysis;
    });
    let testPromise = analysisPromise.then(analysis => {
      let serialization = analysis.serialize();
      assert.deepEqual(serialization.template, {type: TemplateInfo.typeName, identifier: "my-template.html"});
      let factory = new BlockFactory(options, postcss);
      return TemplateAnalysis.deserialize<TemplateInfo>(serialization, factory).then(analysis => {
        let reserialization = analysis.serialize();
        assert.deepEqual(serialization, reserialization);
      });
    });
    return testPromise;
  }
}
