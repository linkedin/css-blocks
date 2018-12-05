import mock from "@css-blocks/build/dist/src/testing/transient-fs";
import { Analysis, BlockCompiler, Options as CSSBlocksOptions, StyleMapping, resolveConfiguration as resolveBlocksConfiguration } from "@css-blocks/core";
import c$$ from "@css-blocks/runtime";
import { TemplateIntegrationOptions } from "@opticss/template-api";
import { flatten } from "@opticss/util";

import * as babel from "babel-core";
import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";
import { OptiCSSOptions, OptimizationResult, Optimizer, postcss } from "opticss";
import * as prettier from "prettier";
import * as testConsole from "test-console";

import { Rewriter } from "../../src";
import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { babelPlugin } from "../../src/transformer/babel";
import { testParse as parse } from "../util";

// Reduce whitespace.
function minify(s: string) {
  mock.restore();
  return prettier.format(s, { parser: "babylon" }).replace(/\n\n/mg, "\n");
}

function transform(code: string, analysis: Analysis<"Opticss.JSXTemplate">, cssBlocksOptions: CSSBlocksOptions = {}, optimizationOpts: Partial<OptiCSSOptions> = {}, templateOpts: Partial<TemplateIntegrationOptions> = {}): Promise<{jsx: babel.BabelFileResult; css: OptimizationResult}> {
  let filename = analysis.template.identifier;
  let optimizer = new Optimizer(optimizationOpts, templateOpts);
  let blockOpts = resolveBlocksConfiguration(cssBlocksOptions);
  optimizer.addAnalysis(analysis.forOptimizer(blockOpts));
  let blocks = analysis.transitiveBlockDependencies();
  let compiler = new BlockCompiler(postcss, blockOpts);
  for (let block of blocks) {
    optimizer.addSource({
      content: compiler.compile(block, block.stylesheet!).toResult({to: blockOpts.importer.filesystemPath(block.identifier, blockOpts) || undefined}),
    });
  }
  return optimizer.optimize("optimized.css").then(result => {
    let rewriter = new Rewriter();
    rewriter.blocks[filename] = new StyleMapping(result.styleMapping, blocks, blockOpts, [analysis]);
    let babelResult = babel.transform(code, {
      filename: filename,
      plugins: [
        babelPlugin({rewriter}),
      ],
      parserOpts: { plugins: [ "jsx" ] },
    });
    return {
      jsx: babelResult,
      css: result,
    };
  });
}

function extractClassNames(node: babel.types.Node): string[][] {
  let classnames: string[][] = [];
  babel.traverse(node, {
    JSXAttribute: (nodePath) => {
      if (nodePath.node.name.name.toString() === "className") {
        let value = nodePath.node.value;
        if (value && value.type === "StringLiteral") {
          classnames.push(value.value.split(/\s+/));
        } else {
          throw new Error("unexpected attribute value node type");
        }
      }
    },
  });
  return classnames;
}

@suite("Transformer | External Objstr Class States")
export class Test {
  after() {
    mock.restore();
  }

  @test "Root styles with :scope applied are rewritten correctly."() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      <div class={bar}></div>;
    `;

    return parse(code, "test.tsx").then((meta: Analyzer) => {
      return transform(code, meta.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';
          <div className="a"></div>;
          `));
      });
    });
  }

  @test "States with sub-states are transformed using string input"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let isDynamic = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: isDynamic
      });

      <div class={style}></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import c$$ from '@css-blocks/runtime';
          import objstr from 'obj-str';
          let isDynamic = true;
          <div className={c$$("a", [1, 1, 2, isDynamic, 1, 0, 'b', 0])}></div>;`,
        ));
        assert.deepEqual(c$$("a", [1, 1, 2, true, 1, 0, "b", 0]), "a b");
      });
    });
  }

  @test "States with sub-states are transformed using boolean input"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=true] {
          color: yellow;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(true)]: true
      });

      <div class={style}></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div className="a b"></div>;`),
        );
      });
    });
  }

  @test "States with sub-states are transformed using numerical input"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=100] {
          color: yellow;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(100)]: true
      });

      <div class={style}></div>;
    `;

    return parse(code, "test.jsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div className="a b"></div>;`));
      });

    });
  }

  @test "States with dynamic sub-states are transformed"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let dynamic = 'yellow';
      let leSigh = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(dynamic)]: leSigh
      });

      <div className={bar}>
      <div className={style}></div></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import c$$ from "@css-blocks/runtime";
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let leSigh = true;

          <div className="a">
          <div className={c$$("b",[1,2,4,2,1,leSigh&&dynamic,"yellow",1,1,"green",1,0,"d",0,"c",1])}></div></div>;`),
        );
        let leSigh = true;
        let dynamic = "green";
        assert.deepEqual(c$$("b", [1, 2, 4, 2, 1, leSigh && dynamic, "yellow", 1, 1, "green", 1, 0, "d", 0, "c", 1]), "b d");
      });
    });
  }

  @test "States with dynamic sub-states are transformed when only a single sub-state exists"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|bool] { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let dynamic = 'yellow';
      let leSigh = true;

      let style = objstr({
        [bar.pretty]: leSigh,
        [bar.pretty.bool()]: true,
        [bar.pretty.color(dynamic)]: true
      });

      <div className={bar}><div class={style}></div></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {
      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
        import c$$ from "@css-blocks/runtime";
        import objstr from "obj-str";
        let dynamic = "yellow";
        let leSigh = true;
        <div className="b">
          <div
            className={c$$([ 3, 2, 0, leSigh, 1, 0, 0, 1, 1, 0, 1, 1, 5, 1, 0, 1,
              0, dynamic, "yellow", 1, 2, "c", -2, 2, 0, 1, "d", 2
            ])}
          />
        </div>;
          `),
        );
        let leSigh = true;
        let dynamic = "yellow";
        assert.deepEqual(c$$([ 3, 2, 0, leSigh, 1, 0, 0, 1, 1, 0, 1, 1, 5, 1, 0, 1,
                               0, dynamic, "yellow", 1, 2, "c", -2, 2, 0, 1, "d", 2]),
                         "c d");
      });
    });
  }

  @test "States with dynamic sub-states containing complex expression are transformed to the simplest possible output"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellowColor] {
          color: yellow;
        }
        .pretty[state|color=greenColor] {
          color: green;
        }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let dynamic = 'yellow';
      function conditional() {
        return true;
      }

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(\`\${dynamic}Color\`)]: conditional()
      });

      <div class={bar}><div class={style}></div></div>;
    `;

    return parse(code, "test.jsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
        import c$$ from "@css-blocks/runtime";
        import objstr from "obj-str";
        let dynamic = "yellow";
        function conditional() {
          return true;
        }
        <div className="a">
          <div className={c$$("b", [1,2,4,2,1,conditional() && \`\${dynamic}Color\`,
                                "yellowColor",1,1,"greenColor",1,0,"d",0,"c",1])} />
        </div>;`),
        );
        function conditional() { return true; }
        let dynamic = "yellow";
        assert.deepEqual(c$$("b", [1, 2, 4, 2, 1, conditional() && `${dynamic}Color`,
                                   "yellowColor", 1, 1, "greenColor", 1, 0, "d", 0, "c", 1]),
                         "b c");
      });
    });
  }

  @test "Gracefully handles conflicting BlockObject names."() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
      `,
      "foo.block.css": `
        :scope { color: white; }
        .pretty { color: black; }
      `,
    });

    let code = `
      import bar from 'bar.block.css';
      import foo from 'foo.block.css';

      <div class={bar.pretty}></div>;
      <div class={foo.pretty}></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        let classNames = flatten<string>(extractClassNames(res.jsx.ast!));
        classNames.sort();
        assert.deepEqual(classNames, ["a", "b"]);
      });
    });
  }

  @test "Can set className dynamically"() {
    mock({
      "bar.block.css": `
        :scope { color: red; }
        .foo { color: blue; }
        .foo[state|happy] { color: balloons; }
      `,
    });

    let code = `
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: true,
      });

      function doesSomething(element, condition) {
        element.className = objstr({
          [bar.foo]: condition,
          [bar.foo.happy()]: true
        });
        element.className = bar;
        element.className = style;
      }
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {
      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let style = 'b';

          function doesSomething(element, condition) {
            element.className = c$$([2,2,0,condition,1,0,0,1,1,0,1,1,"b",0,"c",1]);
            element.className = 'a';
            element.className = style;
          }
        `));
      });
    });
  }

  @test "Doesn't explode with empty blocks."() {
    mock({
      "foo.block.css": `
        :scope { }
        :scope[state|cool] { }
      `,
    });

    let code = `
      import objstr from 'obj-str';
      import foo from 'foo.block.css';
      let styles = objstr({
        [foo]: true,
        [foo.cool()]: true
      });
      <div class={styles}></div>;
    `;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div className="foo a"></div>;
        `));
      });
    });
  }

  @test "Left over references to the block are a warning"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
      "foo.block.css": ":scope { font-family: sans-serif; } .big { font-size: 28px; }",
    });

    let code = `
      import foo from 'foo.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [foo]: true,
        });
        let unusedStyle = objstr({
          [foo.big]: true,
        });
        return ( <div class={style}></div> );
      }`;

    return parse(code, "test.tsx").then((analysis: Analyzer) => {
      let stderr = testConsole.stderr.inspect();
      return transform(code, analysis.getAnalysis(0)).then(_res => {
        let result = stderr.output;
        stderr.restore();
        assert.deepEqual(result.length, 2);
        assert.deepEqual(result[0].trim(), "WARNING: Stray reference to block import (foo). Imports are removed during rewrite so this will probably be a runtime error. (test.tsx:10:11)");
        assert.deepEqual(result[1].trim(), "WARNING: This usually happens when a style reference is incorrectly used outside a jsx expression. But sometimes when an application is improperly configured. Be sure that only files ending in jsx or tsx are involved in the importing of components using css blocks.");
      });
    });
  }
  @test "Left over references in a js file to the block are a warning"() {
    mock({
      "bar.block.css": ":scope { color: red; } .foo { color: blue; }",
      "foo.block.css": ":scope { font-family: sans-serif; } .big { font-size: 28px; }",
    });

    let code = `
      import foo from 'foo.block.css'
      import objstr from 'obj-str';

      function render(){
        let style = objstr({
          [foo]: true,
        });
        let unusedStyle = objstr({
          [foo.big]: true,
        });
        return ( <div class={style}></div> );
      }`;

    return parse(code, "test.js").then((analysis: Analyzer) => {
      let stderr = testConsole.stderr.inspect();
      return transform(code, analysis.getAnalysis(0)).then(_res => {
        let result = stderr.output;
        stderr.restore();
        assert.deepEqual(result.length, 3);
        assert.deepEqual(result[0].trim(), "WARNING: For performance reasons, only jsx and tsx files are properly analyzed for block dependencies and rewritten. Consider renaming test.js to test.jsx as well as any leading to importing it from the entry point.");
        assert.deepEqual(result[1].trim(), "WARNING: Stray reference to block import (foo). Imports are removed during rewrite so this will probably be a runtime error. (test.js:10:11)");
        assert.deepEqual(result[2].trim(), "WARNING: This usually happens when a style reference is incorrectly used outside a jsx expression. But sometimes when an application is improperly configured. Be sure that only files ending in jsx or tsx are involved in the importing of components using css blocks.");
      });
    });
  }
  @skip
  @test "invalid runtime expression"() {
    let args = JSON.parse('[13,21,0,false,1,0,0,0,false,1,13,0,0,true,1,17,0,3,1,0,false,1,1,5,1,0,4,0,null,"small",1,12,"medium",1,11,"large",1,10,"extraLarge",1,9,3,1,0,true,1,5,5,1,0,2,1,null,"square",1,8,"round",1,7,5,1,0,3,1,false,"inverse",1,3,"muted",1,4,"active",1,2,3,1,0,false,1,6,5,1,13,3,1,false,"inverse",1,14,"muted",1,15,"active",1,2,3,1,13,false,1,16,5,1,17,3,1,"muted","inverse",1,18,"muted",1,19,"active",1,2,3,1,17,true,1,20,"primary-button",0,"primary-button--animating",1,"primary-button--color-active",2,"primary-button--color-inverse",3,"primary-button--color-muted",4,"primary-button--fullWidth",5,"primary-button--hoverable",6,"primary-button--shape-round",7,"primary-button--shape-square",8,"primary-button--size-extraLarge",9,"primary-button--size-large",10,"primary-button--size-medium",11,"primary-button--size-small",12,"secondary-button",13,"secondary-button--color-inverse",14,"secondary-button--color-muted",15,"secondary-button--hoverable",16,"tertiary-button",17,"tertiary-button--color-inverse",18,"tertiary-button--color-muted",19,"tertiary-button--hoverable",20]');
    let result = c$$(args);
    assert.deepEqual(result, "tertiary-button tertiary-button--color-muted tertiary-button--hoverable");
  }
}
