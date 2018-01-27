import { assert } from "chai";
import { suite, test, only, skip } from "mocha-typescript";
import * as postcss from "postcss";
import { TemplateInfo, Template, SerializedTemplateAnalysis as SerializedOptimizedAnalysis } from "@opticss/template-api";
import { POSITION_UNKNOWN } from "@opticss/element-analysis";
import { ObjectDictionary } from "@opticss/util";

import * as cssBlocks from "../../src/errors";
import BlockParser from "../../src/BlockParser";
import { BlockFactory } from "../../src/BlockFactory";
import { Importer, ImportedFile } from "../../src/importing";
import { Block, BlockObject, BlockClass, State, SubState } from "../../src/Block";
import { PluginOptions } from "../../src/options";
import { OptionsReader } from "../../src/OptionsReader";
import { SerializedTemplateAnalysis, TemplateAnalysis, ElementAnalysis } from "../../src/TemplateAnalysis";

import { MockImportRegistry } from "./../util/MockImportRegistry";
import { assertParseError } from "./../util/assertError";

type TestElement = ElementAnalysis<null, null, null>;

type BlockAndRoot = [Block, postcss.Container];

@suite("Property Conflict Validator")
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

  @test 'static roots throw error when a property is unresolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a.root, block-b.root
  background: block-a.root, block-b.root`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(bBlock.rootClass);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'static classes throw error when a property is unresolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; }
       .foo  { color: blue; background: yellow; }
      `
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      .bar  { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a.bar, block-b.foo
  background: block-a.bar, block-b.foo`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.getClass('bar') as BlockClass);
        element.addStaticClass(bBlock.getClass('foo') as BlockClass);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'static root and class throw error when a property is unresolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a.foo, block-b.root
  background: block-a.foo, block-b.root`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.getClass('foo') as BlockClass);
        element.addStaticClass((bBlock as Block).rootClass);
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'static classes do not throw when on the same block'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .foo { color: red; }
      .foo[state|bar]  { color: blue;}
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element = analysis.startElement({ line: 10, column: 32 });
      let klass = block.getClass('foo') as BlockClass;
      let state = klass.getState('bar') as State;
      element.addStaticClass(klass);
      element.addStaticState(klass, state);
      analysis.endElement(element);
      assert.deepEqual(1, 1);
    }).then(() => {
      assert.ok(1, 'no error thrown');
    });
  }

  @test 'dynamic classes do not throw when on the same block'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .foo { color: red; }
      .foo[state|bar]  { color: blue;}
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      analysis.blocks[""] = block;
      let element = analysis.startElement({ line: 10, column: 32 });
      let klass = block.getClass('foo') as BlockClass;
      let state = klass.getState('bar') as State;
      element.addDynamicClasses({
        condition: true,
        whenTrue: [klass]
      });
      element.addDynamicState(klass, state, true);
      analysis.endElement(element);
      assert.deepEqual(1, 1);
    }).then(() => {
      assert.ok(1, 'no error thrown');
    });
  }

  @test 'dynamic root and class throw error when a property is unresolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a.foo, block-b.root
  background: block-a.foo, block-b.root`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({
          condition: true,
          whenTrue: [block.getClass('foo') as BlockClass]
        });
        element.addDynamicClasses({
          condition: true,
          whenTrue: [bBlock.rootClass]
        });
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'dynamic root and class throw when on same side of ternary'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a.foo, block-b.root
  background: block-a.foo, block-b.root`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({
          condition: true,
          whenTrue: [block.getClass('foo') as BlockClass, (bBlock as Block).rootClass]
        });
        analysis.endElement(element);
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'dynamic root and class pass when on opposite sides of ternary'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({
          condition: true,
          whenTrue: [block.getClass('foo') as BlockClass],
          whenFalse: [(bBlock as Block).rootClass]
        });
        analysis.endElement(element);
      }).then(() => {
        assert.ok(1, 'does not throw');
      });
  }

  @test 'conflicting classes and dynamic states throw'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      [state|foo] { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-b.root, block-a[state|foo]
  background: block-b.root, block-a[state|foo]`, this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["b"] = bBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticClass(bBlock.rootClass);
      element.addDynamicState(block.rootClass, block.rootClass.getState('foo') as State, {});
      analysis.endElement(element);
    }).then(() => {
      assert.ok(1, 'does not throw');
    }));
  }

  @test 'conflicting dynamic states throw'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",`
      .root { block-name: block-b; }
      [state|bar] { color: blue; background: yellow; }
    `
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      [state|foo] { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-a[state|foo], block-b[state|bar]
  background: block-a[state|foo], block-b[state|bar]`, this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(bBlock.rootClass);
        element.addDynamicState(block.rootClass, block.rootClass.getState('foo') as State, {});
        element.addDynamicState(bBlock.rootClass, bBlock.rootClass.getState('bar') as State, {});
        analysis.endElement(element);
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'conflicting classes and dynamic state groups throw'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css", `
      .root { block-name: block-b; color: blue; background: yellow; }
    `
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      [state|foo=one] { color: red; background: red; }
      [state|foo=two] { text-decoration: underline; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-b.root, block-a[state|foo=one]
  background: block-b.root, block-a[state|foo=one]`, this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(bBlock.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup('foo') as ObjectDictionary<SubState>, {});
        analysis.endElement(element);
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'conflicting dynamic state groups throw'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css", `
      .root { block-name: block-b; color: blue; background: yellow; }
      [state|bar=one] { color: red; background: red; }
      [state|bar=two] { color: yellow; background: purple; }
    `
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; }
      [state|foo=one] { color: orange; background: green; }
      [state|foo=two] { text-decoration: underline; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
      `The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-b.root, block-a[state|foo=one], block-b[state|bar=one], block-b[state|bar=two]
  background: block-b.root, block-a[state|foo=one], block-b[state|bar=one], block-b[state|bar=two]`, this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addStaticClass(block.rootClass);
        element.addStaticClass(bBlock.rootClass);
        element.addDynamicGroup(block.rootClass, block.rootClass.resolveGroup('foo') as ObjectDictionary<SubState>, {});
        element.addDynamicGroup(bBlock.rootClass, bBlock.rootClass.resolveGroup('bar') as ObjectDictionary<SubState>, {});
        analysis.endElement(element);
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'multiple conflicts on same property display correct error'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    imports.registerSource("blocks/c.css", `
      .root { block-name: block-c; }
      .bar { color: green; }
    `);

    let css = `
      @block-reference b from "./b.css";
      @block-reference c from "./c.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,
`The following property conflicts must be resolved for element located at (templates/my-template.hbs:10:32)
  color: block-b.root, block-c.bar, block-a.foo
  background: block-b.root, block-a.foo`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
        let cBlock = analysis.blocks["c"] = block.getReferencedBlock("c") as Block;
        analysis.blocks[""] = block;
        analysis.blocks["b"] = bBlock;
        analysis.blocks["c"] = cBlock;
        let element = analysis.startElement({ line: 10, column: 32 });
        element.addDynamicClasses({
          condition: true,
          whenTrue: [block.getClass('foo') as BlockClass],
        });
        element.addStaticClass(bBlock.rootClass);
        element.addStaticClass(cBlock.getClass('bar') as BlockClass);
        analysis.endElement(element);
      })
    );
  }

  @test 'conflicting roots pass when a property is explicitly resolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.root { block-name: block-b; color: blue; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .root { block-name: block-a; color: resolve('b'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["b"] = bBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.rootClass);
      element.addStaticClass(bBlock.rootClass);
      analysis.endElement(element);
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test 'conflicting classes pass when a property is explicitly resolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css",
      `.klass { color: blue; }`
    );

    let css = `
      @block-reference b from "./b.css";
      .klass { color: resolve('b.klass'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["b"] = bBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      element.addStaticClass(block.getClass('klass') as BlockClass);
      element.addStaticClass(bBlock.getClass('klass') as BlockClass);
      analysis.endElement(element);
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test 'conflicting states pass when a property is explicitly resolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.css", `
      .klass {}
      .klass[state|foo] { color: blue; }
    `);

    let css = `
      @block-reference b from "./b.css";
      .klass {}
      .klass[state|foo] { color: resolve('b.klass[state|foo]'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      let bBlock = analysis.blocks["b"] = block.getReferencedBlock("b") as Block;
      analysis.blocks[""] = block;
      analysis.blocks["b"] = bBlock;
      let element = analysis.startElement({ line: 10, column: 32 });
      let aClass = block.getClass('klass') as BlockClass;
      let bClass = bBlock.getClass('klass') as BlockClass;
      element.addStaticClass(aClass);
      element.addStaticClass(bClass);
      element.addStaticState(aClass, aClass.getState('foo') as State);
      element.addStaticState(bClass, bClass.getState('foo') as State);
      analysis.endElement(element);
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }
}
