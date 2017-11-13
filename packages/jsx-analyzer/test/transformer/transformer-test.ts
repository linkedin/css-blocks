import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import * as babel from 'babel-core';
import { StyleMapping, PluginOptionsReader, CssBlockOptions, TemplateAnalysis } from 'css-blocks';

import { MetaAnalysis } from '../../src/utils/Analysis';
import analyzer from '../../src/analyzer';
import Transformer from '../../src';
import { testParse as parse } from '../util';
import { Optimizer, OptiCSSOptions } from 'opticss';
import { TemplateIntegrationOptions, TemplateTypes } from '@opticss/template-api';

const mock = require('mock-fs');

// Reduce whitespace.
function minify(s: string) {
  return s ? s.replace(/^[\s\n]+|[\s\n]+$/gm, '') : '';
}

function transform(code: string, analysis: MetaAnalysis, cssBlocksOptions: Partial<CssBlockOptions> = {}, optimizationOpts: Partial<OptiCSSOptions> = {}, templateOpts: Partial<TemplateIntegrationOptions> = {}): Promise<babel.BabelFileResult> {

  let optimizer = new Optimizer(optimizationOpts, templateOpts);
  let reader = new PluginOptionsReader(cssBlocksOptions);
  let analyses = new Array<TemplateAnalysis<keyof TemplateTypes>>();
  analysis.eachAnalysis(a => {
    analyses.push(<TemplateAnalysis<'Opticss.JSXTemplate'>>a);
    optimizer.addAnalysis(a.forOptimizer(reader));
  });
  let blocks = analysis.transitiveBlockDependencies();
  for (let block of blocks) {
    optimizer.addSource({
      content: block.root!.toResult({to: reader.importer.filesystemPath(block.identifier, reader) || undefined}),
    });
  }
  return optimizer.optimize('optimized.css').then(result => {
    let rewriter = new Transformer.Rewriter();
    rewriter.blocks['test.tsx'] = new StyleMapping(result.styleMapping, blocks, reader, analyses);
    return babel.transform(code, {
      filename: 'test.tsx',
      plugins: [
        [ require('../../src/transformer/babel').default, { rewriter } ]
      ],
      parserOpts: { plugins: [ 'jsx' ] }
    });
  });

}

@suite('Transformer | External Objstr Class States')
export class Test {

  @test 'exists'() {
    assert.equal(typeof analyzer, 'function');
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

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          <div class="bar"></div>;
          <div class="bar"></div>;`));
        });
    });
  }

  @test 'Discovers multiple objstr, even if not obviously used on an element.'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
      `
    });

    let code = `
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true
      });

      let rootStyle = objstr({
        [bar]: true
      });
    `;

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();

      return transform(code, analysis).then(res =>{
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          let style = objstr({
            'bar__pretty': true
          });

          let rootStyle = objstr({
            'bar': true
          });`
        ));
      });
    });
  }

  @test 'States with substates are transformed using string input'(){
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

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-yellow': true
          });

          <div class={style}></div>;`
        ));
      });
    });
  }

  @test 'States with substates are transformed using boolean input'(){
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
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
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

  @test 'States with substates are transformed using numerical input'(){
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
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-100': true
          });

          <div class={style}></div>;`));
      });

    });
  }

  @test 'States with dynamic substates are transformed'(){
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
      let ohgod = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(dynamic)]: ohgod
      });

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let ohgod = true;

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--color-yellow': dynamic === 'yellow' && ohgod,
            'bar__pretty--color-green': dynamic === 'green' && ohgod
          });

          <div class="bar"><div class={style}></div></div>;`)
        );
      });
    });
  }

  @test 'States with dynamic substates are transformed when only a single substate exists'(){
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
      let ohgod = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.bool()]: true,
        [bar.pretty.color(dynamic)]: ohgod
      });

      <div class={bar.root}><div class={style}></div></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          import objstr from 'obj-str';

          let dynamic = 'yellow';
          let ohgod = true;

          let style = objstr({
            'bar__pretty': true,
            'bar__pretty--bool': true,
            'bar__pretty--color-yellow': dynamic === 'yellow' && ohgod
          });

          <div class="bar"><div class={style}></div></div>;`)
        );
      });
    });
  }

  @test 'States with dynamic substates containing complex expression are transformed to the simplest possible output'(){
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
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
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
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
          <div class="bar__pretty"></div>;
          <div class="foo__pretty"></div>;
        `));
      });
    });
  }

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
      mock.restore();

      return transform(code, analysis).then(res => {
        assert.equal(minify(res.code!), minify(`
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

  @test 'Throws when spread operator used in states.'(){
    mock({
      'foo.block.css': `
        .root { }
        [state|cool=foo] { }
      `
    });

    let code = `
      import objstr from 'obj-str';
      import foo from 'foo.block.css';

      let args = [ 'foo' ];

      let styles = objstr({
        [foo]: true,
        [foo.cool(...args)]: true
      });
      <div class={styles}></div>;
    `;

    return parse(code).then((analysis: MetaAnalysis) => {
      mock.restore();
      transform(code, analysis);
      assert.ok(false, 'Should never get here.');
    }).catch((e) => {
      assert.equal(e.message, 'test.tsx: [css-blocks] RewriteError: The spread operator is not allowed in CSS Block states. (9:18)');
    });
  }
}
