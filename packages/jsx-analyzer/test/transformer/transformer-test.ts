import { assert } from 'chai';
import { suite, test, skip } from 'mocha-typescript';
import * as babel from 'babel-core';
import { StyleMapping, PluginOptionsReader, CssBlockOptions, BlockCompiler } from 'css-blocks';
import * as postcss from 'postcss';
import * as prettier from 'prettier';

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
          import { classNameHelper as cla$$ } from '@css-blocks/jsx';
          import objstr from 'obj-str';
          <div class={cla$$([1, 1, 6, 0, 'a', 0])}></div>;
          <div class={cla$$([1, 1, 6, 0, 'a', 0])}></div>;
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

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: true
      });

      <div class={style}></div>;
    `;

    return parse(code, 'test.tsx').then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.deepEqual(minify(res.jsx.code!), minify(`
          import { classNameHelper as cla$$ } from '@css-blocks/jsx';
          import objstr from 'obj-str';

          <div class={cla$$([2, 2, 6, 0, 6, 1, 'a', 0, 'b', 1])}></div>;`
        ));
      });
    });
  }

  @skip
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

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-true': true
          });

          <div class={style}></div>;`)
        );
      });
    });
  }

  @skip
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

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-100': true
          });

          <div class={style}></div>;`));
      });

    });
  }

  @skip
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
      let ohGod = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(dynamic)]: ohGod
      });

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let ohGod = true;

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-yellow': dynamic === 'yellow' && ohGod,
            'bar__pretty--color-green': dynamic === 'green' && ohGod
          });

          <div class="bar"><div class={style}></div></div>;`)
        );
      });
    });
  }

  @skip
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
      let ohGod = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.bool()]: true,
        [bar.pretty.color(dynamic)]: ohGod
      });

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let ohGod = true;

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--bool': true,
            'bar__pretty--color-yellow': dynamic === 'yellow' && ohGod
          });

          <div class="bar"><div class={style}></div></div>;`)
        );
      });
    });
  }

  @skip
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

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(\`\${dynamic}Color\`)]: true
      });

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let dynamic = 'yellow';

          const _condition = \`\${dynamic}Color\`;
          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-yellowColor': _condition === 'yellowColor',
            'bar__pretty--color-greenColor': _condition === 'greenColor'
          });

          <div class="bar"><div class={style}></div></div>;`)
        );
      });
    });
  }

  @skip
  @test 'Gracefully handles conflicting BlockObject names.'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
      `,
      'foo.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
      `
    });

    let code = `
      import bar from 'bar.block.css';
      import foo from 'foo.block.css';

      <div class={bar.pretty}></div>;
      <div class={foo.pretty}></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          <div class="bar__pretty"></div>;
          <div class="foo__pretty"></div>;
        `));
      });
    });
  }

  @skip
  @test 'Doesn\'t explode with empty blocks.'(){
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

    return parse(code).then((analysis: MetaAnalysis) => {

      return transform(code, analysis.getAnalysis(0)).then(res => {
        assert.equal(minify(res.jsx.code!), minify(`
          import objstr from 'obj-str';

          let styles = objstr({
            'foo': true,
            'foo--cool': true
          });
          <div class={styles}></div>;
        `));
      });
    });
  }
}
