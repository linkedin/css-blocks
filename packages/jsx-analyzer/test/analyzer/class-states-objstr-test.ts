import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import analyzer from '../../src/analyzer';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | External Objstr Class States')
export class Test {

  @test 'exists'() {
    assert.equal(typeof analyzer, 'function');
  }

  @test 'States with sub-states are tracked'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: true
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @test 'When provided state value is dynamic, state object is registered as dynamic'(){
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

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let ohGod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("yellow")]: ohGod
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 1);
    });
  }

  @test 'Handles inherited states'(){
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
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

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let ohGod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color('yellow')]: ohGod,
        [bar.pretty.color('black')]: !ohGod
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 3);
      assert.equal(analysis.dynamicCount(), 2);
    });
  }

  @test 'Handles dynamic states'(){
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
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

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let ohGod = true;
      let state = 'yellow';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color(state)]: ohGod,
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 4);
      assert.equal(analysis.dynamicCount(), 3);
    });
  }

  @test 'Throws error when no sub-state passed'(){
    mock({
      'bar.block.css': `
        @block-reference foo from "./foo.block.css";
        .root { extends: foo; }
        .pretty[state|color=black] {
          color: black;
        }
      `,
      'foo.block.css': `
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

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let ohGod = true;

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color()]: ohGod,
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.ok(false, 'Should never get here');
    }).catch((err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: State bar.pretty.color() expects a sub-state. (9:9)');
    });
  }

  @test 'Boolean states register'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let ohGod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.awesome()]: ohGod
      });
      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 1);
    });
  }

  @test 'Accessing sub-state on boolean state throws'(){
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let ohGod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.awesome('wat')]: ohGod
      });
      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.ok(false, 'Should never get here');
    }).catch((err) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No state [state|awesome=wat] found on block "bar".\n  Did you mean: .pretty[state|awesome]? (7:7)');
    });
  }

}
