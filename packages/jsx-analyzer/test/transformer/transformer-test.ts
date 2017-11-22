import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import * as babel from 'babel-core';
import { StyleMapping, PluginOptionsReader, CssBlockOptions, BlockCompiler } from 'css-blocks';
import * as postcss from 'postcss';
import * as prettier from 'prettier';
import c$$ from '../../runtime/classnames';

import JSXAnalysis, { MetaAnalysis } from '../../src/utils/Analysis';
import Transformer from '../../src';
import { testParse as parse } from '../util';
import { Optimizer, OptiCSSOptions, OptimizationResult  } from 'opticss';
import { TemplateIntegrationOptions } from '@opticss/template-api';

const mock = require('mock-fs');

// Reduce whitespace.
function minify(s: string) {
  mock.restore();
  return prettier.format(s).replace(/\n\n/mg, '\n');
}

const mkPlugin = require('../../src/transformer/babel').default;

function transform(code: string, analysis: JSXAnalysis, cssBlocksOptions: Partial<CssBlockOptions> = {}, optimizationOpts: Partial<OptiCSSOptions> = {}, templateOpts: Partial<TemplateIntegrationOptions> = {}): Promise<{jsx: babel.BabelFileResult, css: OptimizationResult}> {
  let filename = analysis.template.identifier;
  let optimizer = new Optimizer(optimizationOpts, templateOpts);
  let reader = new PluginOptionsReader(cssBlocksOptions);
  optimizer.addAnalysis(analysis.forOptimizer(reader));
  let blocks = analysis.transitiveBlockDependencies();
  let compiler = new BlockCompiler(postcss, reader);
  for (let block of blocks) {
    optimizer.addSource({
      content: compiler.compile(block, block.root!).toResult({to: reader.importer.filesystemPath(block.identifier, reader) || undefined}),
    });
  }
  return optimizer.optimize('optimized.css').then(result => {
    let rewriter = new Transformer.Rewriter();
    rewriter.blocks[filename] = new StyleMapping(result.styleMapping, blocks, reader, [analysis]);
    let babelResult = babel.transform(code, {
      filename: filename,
      plugins: [
        mkPlugin({rewriter})
      ],
      parserOpts: { plugins: [ 'jsx' ] }
    });
    return {
      jsx: babelResult,
      css: result
    };
  });

}

@suite('Transformer | External Objstr Class States')
export class Test {
  after() {
    mock.restore();
  }

  @test 'Root styles with and without .root are rewritten correctly.'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
      `
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      <div class={bar}></div>;
      <div class={bar.root}></div>;

    `;

    return parse(code, 'test.tsx').then((meta: MetaAnalysis) => {
      return transform(code, meta.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';
          <div class="a"></div>;
          <div class="a"></div>;
          `));
      });
    });
  }

  @test 'States with sub-states are transformed using string input'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `
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

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import c$$ from '@css-blocks/jsx';
          import objstr from 'obj-str';
          let isDynamic = true;
          <div class={c$$("a", [1, 1, 2, isDynamic, 1, 0, 'b', 0])}></div>;`
        ));
        assert.deepEqual(c$$('a', [1, 1, 2, true, 1, 0, 'b', 0]), 'a b');
      });
    });
  }

  @test 'States with sub-states are transformed using boolean input'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=true] {
          color: yellow;
        }
      `
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

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div class="a b"></div>;`)
        );
      });
    });
  }

  @test 'States with sub-states are transformed using numerical input'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=100] {
          color: yellow;
        }
      `
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

    return parse(code, 'test.jsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div class="a b"></div>;`));
      });

    });
  }

  @test 'States with dynamic sub-states are transformed'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
        .pretty[state|color=green] {
          color: green;
        }
      `
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

      <div class={bar.root}>
      <div class={style}></div></div>;
    `;

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import c$$ from "@css-blocks/jsx";
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let leSigh = true;

          <div class="a">
          <div class={c$$("b",[1,2,4,2,1,leSigh&&dynamic,"yellow",1,1,"green",1,0,"d",0,"c",1])}></div></div>;`)
        );
        let leSigh = true;
        let dynamic = 'green';
        assert.deepEqual(c$$('b',[1,2,4,2,1,leSigh&&dynamic,'yellow',1,1,'green',1,0,'d',0,'c',1]), 'b d');
      });
    });
  }

  @test 'States with dynamic sub-states are transformed when only a single sub-state exists'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|bool] { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `
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

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {
      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
        import c$$ from "@css-blocks/jsx";
        import objstr from "obj-str";
        let dynamic = "yellow";
        let leSigh = true;
        <div class="b">
          <div
            class={c$$([ 3, 2, 0, leSigh, 1, 0, 0, 1, 1, 0, 1, 1, 5, 1, 0, 1,
              0, dynamic, "yellow", 1, 2, "c", -2, 2, 0, 1, "d", 2
            ])}
          />
        </div>;
          `)
        );
        let leSigh = true;
        let dynamic = 'yellow';
        assert.deepEqual(c$$([ 3, 2, 0, leSigh, 1, 0, 0, 1, 1, 0, 1, 1, 5, 1, 0, 1,
              0, dynamic, 'yellow', 1, 2, 'c', -2, 2, 0, 1, 'd', 2]), 'c d');
      });
    });
  }

  @test 'States with dynamic sub-states containing complex expression are transformed to the simplest possible output'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellowColor] {
          color: yellow;
        }
        .pretty[state|color=greenColor] {
          color: green;
        }
      `
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

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code, 'test.jsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
        import c$$ from "@css-blocks/jsx";
        import objstr from "obj-str";
        let dynamic = "yellow";
        function conditional() {
          return true;
        }
        <div class="a">
          <div class={c$$("b", [1,2,4,2,1,conditional() && \`\${dynamic}Color\`,
                                "yellowColor",1,1,"greenColor",1,0,"d",0,"c",1])} />
        </div>;`)
        );
        function conditional() { return true;}
        let dynamic = 'yellow';
        assert.deepEqual(c$$('b', [1,2,4,2,1,conditional() && `${dynamic}Color`,
                                'yellowColor',1,1,'greenColor',1,0,'d',0,'c',1]), 'b c');
      });
    });
  }

  @test 'Gracefully handles conflicting BlockObject names.'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
      `,
      'foo.block.css': `
        .root { color: white; }
        .pretty { color: black; }
      `
    });

    let code = `
      import bar from 'bar.block.css';
      import foo from 'foo.block.css';

      <div class={bar.pretty}></div>;
      <div class={foo.pretty}></div>;
    `;

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          <div class="a"></div>;
          <div class="b"></div>;
        `));
      });
    });
  }

  @test "Doesn't explode with empty blocks."(){
    mock({
      'foo.block.css': `
        .root { }
        [state|cool] { }
      `
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

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          <div class="foo a"></div>;
        `));
      });
    });
  }

  @test 'Left over references to the block are an error'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
      'foo.block.css': '.root { font-family: sans-serif; } .big { font-size: 28px; }'
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

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {
      return transform(code, analysis.getAnalysis(0)).then(res => {
        console.log(res.jsx.code);
        assert.ok(false, 'should not have succeeded.');
      }, e => {
        assert.equal(e.message, 'test.tsx: [css-blocks] AnalysisError: Stray reference to block import. Imports are removed during rewrite. (test.tsx:10:11)');
      });
    });
  }
}
