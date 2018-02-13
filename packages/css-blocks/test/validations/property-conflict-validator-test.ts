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

  @test 'properties of the same value do not throw an error'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; color: blue; background-color: yellow; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block, '.root', 'b.root').end();
      assert.deepEqual(1, 1);
    });
  }

  @test 'properties of the same value that have been redefined in-ruleset do not throw an error'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: red; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; color: blue; background-color: yellow; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block, '.root', 'b.root').end();
      assert.deepEqual(1, 1);
    });
  }

  @test 'properties of the different values that have been redefined in-ruleset throw an error'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; color: red; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; color: blue; background-color: yellow; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.root (blocks/foo.block.css:3:36)
    block-b.root (blocks/b.block.css:1:43)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').end();
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'properties that have potential conflicts in alternate rulesets throw an error'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",`
      .root { block-name: block-b; }
      .klass { color: blue; background: yellow; }
      [state|colorful] .klass { color: red; }
    `);

    let css = `
    @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .klass { color: blue; background-color: yellow; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.klass (blocks/foo.block.css:4:16)
    block-b.klass (blocks/b.block.css:4:33)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.klass', 'b.klass').end();
      })
    );
  }

  @test 'static roots throw error when a property is unresolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.root (blocks/foo.block.css:3:36)
    block-b.root (blocks/b.block.css:1:30)

  background-color:
    block-a.root (blocks/foo.block.css:3:48)
    block-b.root (blocks/b.block.css:1:43)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').end();
      })
    );
  }

  @test 'static classes throw error when a property is unresolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; }
       .foo  { color: blue; background-color: yellow; }
      `
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .bar  { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.bar (blocks/foo.block.css:4:15)
    block-b.foo (blocks/b.block.css:2:16)

  background-color:
    block-a.bar (blocks/foo.block.css:4:27)
    block-b.foo (blocks/b.block.css:2:29)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.bar', 'b.foo').end();
      })
    );
  }

  @test 'static root and class throw error when a property is unresolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .foo  { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.foo (blocks/foo.block.css:4:15)
    block-b.root (blocks/b.block.css:1:30)

  background-color:
    block-a.foo (blocks/foo.block.css:4:27)
    block-b.root (blocks/b.block.css:1:43)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.foo', 'b.root').end();
      })
    );
  }

  @test 'mixed static classes and states do not throw when on the same block'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .foo { color: red; }
      .foo[state|bar]  { color: blue;}
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block, '.foo', '.foo[state|bar]').end();
      assert.deepEqual(1, 1);
    }).then(() => {
      assert.ok(1, 'no error thrown');
    });
  }

  @test 'dynamic classes do not throw when on the same block'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .foo { color: red; }
      .foo[state|bar]  { color: blue;}
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block).addDynamic(['.foo']).addDynamic('.foo[state|bar]').end();
    }).then(() => {
      assert.ok(1, 'no error thrown');
    });
  }

  @test 'dynamic root and class throw error when a property is unresolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .foo  { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.foo (blocks/foo.block.css:4:15)
    block-b.root (blocks/b.block.css:1:30)

  background-color:
    block-a.foo (blocks/foo.block.css:4:27)
    block-b.root (blocks/b.block.css:1:43)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block).addDynamic(['.foo']).addDynamic(['b.root']).end();
      })
    );
  }

  @test 'dynamic root and class throw error when a on same side of ternary'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .foo  { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.foo (blocks/foo.block.css:4:15)
    block-b.root (blocks/b.block.css:1:30)

  background-color:
    block-a.foo (blocks/foo.block.css:4:27)
    block-b.root (blocks/b.block.css:1:43)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block).addDynamic(['.foo', 'b.root']).end();
      })
    );
  }

  @test 'dynamic root and class pass when on opposite sides of ternary'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .foo  { color: red; background: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block).addDynamic(['.foo'], ['b.root']).end();
      }).then(() => {
        assert.ok(1, 'does not throw');
      });
  }

  @test 'conflicting classes and dynamic states throw'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      [state|foo] { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-b.root (blocks/b.block.css:1:30)
    block-a[state|foo] (blocks/foo.block.css:4:21)

  background-color:
    block-b.root (blocks/b.block.css:1:43)
    block-a[state|foo] (blocks/foo.block.css:4:33)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').addDynamic('[state|foo]').end();
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'conflicting dynamic states throw'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",`
      .root { block-name: block-b; }
      [state|bar] { color: blue; background-color: yellow; }
    `
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      [state|foo] { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a[state|foo] (blocks/foo.block.css:4:21)
    block-b[state|bar] (blocks/b.block.css:3:21)

  background-color:
    block-a[state|foo] (blocks/foo.block.css:4:33)
    block-b[state|bar] (blocks/b.block.css:3:34)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').addDynamic('[state|foo]').addDynamic('b[state|bar]').end();
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'conflicting classes and dynamic state groups throw'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .root { block-name: block-b; color: blue; background-color: yellow; }
    `
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      [state|foo=one] { color: red; background-color: red; }
      [state|foo=two] { text-decoration: underline; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-b.root (blocks/b.block.css:2:36)
    block-a[state|foo=one] (blocks/foo.block.css:4:25)

  background-color:
    block-b.root (blocks/b.block.css:2:49)
    block-a[state|foo=one] (blocks/foo.block.css:4:37)`,

    this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').addStateGroup('.root', 'foo').end();
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'conflicting dynamic state groups throw'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .root { block-name: block-b; color: blue; background-color: yellow; }
      [state|bar=one] { color: red; background-color: red; }
      [state|bar=two] { color: yellow; background-color: purple; }
    `
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      [state|foo=one] { color: orange; background-color: green; }
      [state|foo=two] { text-decoration: underline; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-b.root (blocks/b.block.css:2:36)
    block-a[state|foo=one] (blocks/foo.block.css:4:25)
    block-b[state|bar=one] (blocks/b.block.css:3:25)
    block-b[state|bar=two] (blocks/b.block.css:4:25)

  background-color:
    block-b.root (blocks/b.block.css:2:49)
    block-a[state|foo=one] (blocks/foo.block.css:4:40)
    block-b[state|bar=one] (blocks/b.block.css:3:37)
    block-b[state|bar=two] (blocks/b.block.css:4:40)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, '.root', 'b.root').addStateGroup('.root', 'foo').addStateGroup('b.root', 'bar').end();
      }).then(() => {
        assert.ok(1, 'does not throw');
      }));
  }

  @test 'multiple conflicts on same property display correct error'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; background-color: yellow; }`
    );

    imports.registerSource("blocks/c.block.css", `
      .root { block-name: block-c; }
      .bar { color: green; }
    `);

    let css = `
      @block-reference b from "./b.block.css";
      @block-reference c from "./c.block.css";
      .root { block-name: block-a; }
      .foo  { color: red; background-color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-b.root (blocks/b.block.css:1:30)
    block-c.bar (blocks/c.block.css:3:14)
    block-a.foo (blocks/foo.block.css:5:15)

  background-color:
    block-b.root (blocks/b.block.css:1:43)
    block-a.foo (blocks/foo.block.css:5:27)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        constructElement(block, 'b.root', 'c.bar').addDynamic(['.foo']).end();
      })
    );
  }

  @test 'conflicting roots pass when a property is explicitly resolved'() {
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; color: blue; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; color: resolve('b'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      constructElement(block, '.root', 'b.root').end();
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test 'conflicting classes pass when a property is explicitly resolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.klass { color: blue; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .klass { color: resolve('b.klass'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      return constructElement(block, '.klass', 'b.klass').end();
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test "Block references in resolve statements that can't be resolved throw helpful error"() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    let css = `
      .root { block-name: block-a; }
      .klass:before { color: resolve('b.klass'); color: red; }
      .klass { color: red; }
    `;

    return assertParseError(
      cssBlocks.CssBlockError,
      `No Block named "b" found in scope. (blocks/foo.block.css:3:23)`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test "Style paths in resolve statements that can't be resolved throw helpful error"() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; }`
    );

    let css = `
      @block-reference b from './b.block.css';
      .root { block-name: block-a; }
      .klass:before { color: resolve('b.klass'); color: red; }
      .klass { color: red; }
    `;

    return assertParseError(
      cssBlocks.CssBlockError,
      `No Style ".klass" found on Block "block-b". (blocks/foo.block.css:4:23)`,
      this.parseBlock(css, "blocks/foo.block.css", reader).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test "resolutions don't leak out of pseudos"() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; }
       .klass:before { color: yellow; }
       .klass { color: blue; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .klass:before { color: resolve('b.klass'); color: green; }
      .klass { color: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  color:
    block-a.klass (blocks/foo.block.css:5:16)
    block-b.klass (blocks/b.block.css:3:17)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflicting states pass when a property is explicitly resolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .klass {}
      .klass[state|foo] { color: blue; }
    `);

    let css = `
      @block-reference b from "./b.block.css";
      .klass {}
      .klass[state|foo] { color: resolve('b.klass[state|foo]'); color: red; }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      return constructElement(block, '.klass', 'b.klass', '.klass[state|foo]', 'b.klass[state|foo]').end();
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test 'conflict validator expands shorthands'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.klass { background-color: blue; border: 1px solid red; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .klass { background: red; border-color: yellow; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  background-color:
    analysis.klass (blocks/foo.block.css:3:16)
    b.klass (blocks/b.block.css:1:10)

  border-color:
    analysis.klass (blocks/foo.block.css:3:33)
    b.klass (blocks/b.block.css:1:34)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflict validator expands shorthands and manages longhand re-declarations'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.klass { border: 1px solid red; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .klass { border-color: green; border-left-color: yellow }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  border-color:
    analysis.klass (blocks/foo.block.css:3:16)
    b.klass (blocks/b.block.css:1:10)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflict validator expands shorthands and uses lowest common property'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.klass { background-color: blue; border: 1px solid red; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .klass { background: red; border-left-color: yellow }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  background-color:
    analysis.klass (blocks/foo.block.css:3:16)
    b.klass (blocks/b.block.css:1:10)

  border-left-color:
    analysis.klass (blocks/foo.block.css:3:33)
    b.klass (blocks/b.block.css:1:34)`,

     this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflict validator expands shorthands and manages multiple longhand conflicts'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.klass { border: 1px solid red; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .klass { border-right-color: green; border-left-color: yellow }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  border-left-color:
    analysis.klass (blocks/foo.block.css:3:43)
    b.klass (blocks/b.block.css:1:10)

  border-right-color:
    analysis.klass (blocks/foo.block.css:3:16)
    b.klass (blocks/b.block.css:1:10)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflicts may be resolved by a shorthand'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .root { block-name: b; }
      .klass { background-color: blue; }
    `);

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: a; }
      .klass { background-color: red; background: resolve('b.klass'); }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      return constructElement(block, '.klass', 'b.klass').end();
    }).then(() => {
      assert.deepEqual(1, 1);
    });
  }

  @test 'shorthand conflicts cannot be resolved by a longhand'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .root { block-name: b-block; }
      .klass { border-color: blue; }
    `);

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: a-block; }
      .klass { border-color: red; border-left-color: resolve('b.klass'); }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  border-color:
    a-block.klass (blocks/foo.block.css:4:16)
    b-block.klass (blocks/b.block.css:3:16)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'conflict validation errors are thrown on custom properties'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css", `
      .root { block-name: block-b; }
      .klass { custom-prop: blue; }
    `);

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .klass { custom-prop: red; }
    `;

    return assertParseError(
      cssBlocks.TemplateAnalysisError,

`The following property conflicts must be resolved for these co-located Styles: (templates/my-template.hbs:10:32)

  custom-prop:
    block-a.klass (blocks/foo.block.css:4:16)
    block-b.klass (blocks/b.block.css:3:16)`,

      this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      })
    );
  }

  @test 'custom properties may be resolved'() {
    let imports = new MockImportRegistry();
    let options: PluginOptions = { importer: imports.importer() };
    let reader = new OptionsReader(options);

    imports.registerSource("blocks/b.block.css",
      `.root { block-name: block-b; }
       .klass { custom-prop: blue; }`
    );

    let css = `
      @block-reference b from "./b.block.css";
      .root { block-name: block-a; }
      .klass { custom-prop: red; custom-prop: resolve('b.klass'); }
    `;

    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
        return constructElement(block, '.klass', 'b.klass').end();
      }).then(() => {
        assert.deepEqual(1, 1);
      });
  }

}

function constructElement(block: Block, ...styles: string[]){
  let info = new Template("templates/my-template.hbs");
  let analysis = new TemplateAnalysis(info);

  analysis.blocks[""] = block;
  block.eachBlockReference( (name, ref) => {
    analysis.blocks[name] = ref;
  });

  let element = analysis.startElement({ line: 10, column: 32 });

  for (let path of styles) {
    let style = block.lookup(path);
    if (!style) { throw Error(`Error looking up Style ${path} for test.`); }
    if (style instanceof BlockClass) {
      element.addStaticClass(style);
    }
    else if (style instanceof State) {
      element.addStaticState(style.parent, style);
    }
  }

  return {
    addDynamic(truthy: string[] | string, falsy?: string[]) {
      if (typeof truthy === 'string') {
        let state = block.lookup(truthy) as State;
        element.addDynamicState(state.parent, state, true);
        return this;
      }
      let truthyStyles = truthy.map(block.lookup.bind(block));
      let falsyStyles = falsy ? falsy.map(block.lookup.bind(block)) : undefined;
      element.addDynamicClasses({
        condition: true,
        whenTrue: truthyStyles as BlockClass[],
        whenFalse: falsyStyles
      });
      return this;
    },
    addStateGroup(base: string, groupName: string){
      let baseStyle = block.lookup(base) as BlockClass;
      element.addDynamicGroup(baseStyle, baseStyle.resolveGroup(groupName) as ObjectDictionary<SubState>, {});
      return this;
    },
    end() {
      analysis.endElement(element);
      return analysis;
    }
  };

}