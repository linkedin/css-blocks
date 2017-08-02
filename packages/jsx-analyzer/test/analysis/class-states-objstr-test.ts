import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import analyzer from '../../src/analyzer';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('External Objstr Class States')
export class Test {

  @test 'exists'() {
    assert.equal(typeof analyzer, 'function');
  }

  @test 'States with substates are tracked'(){
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
      import bar, { states as barStates } from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty[barStates.color.yellow]]: true
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.deepEqual(analysis.getAnalysis(0).template.localStates, {'bar': 'barStates'});
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 2);
      assert.equal(analysis.getDynamicStyles().size, 0);
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
      import bar, { states as barStates } from 'bar.block.css';
      import objstr from 'obj-str';
      let ohgod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty[barStates.color.yellow]]: ohgod
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 2);
      assert.equal(analysis.getDynamicStyles().size, 1);
    });
  }

  @test 'Handles inherited states'(){
    mock({
      'bar.block.css': `
        @block-reference "./foo.block.css";
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
      import bar, { states as barStates } from 'bar.block.css';
      import objstr from 'obj-str';
      let ohgod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty[barStates.color.yellow]]: ohgod,
        [bar.pretty[barStates.color.black]]: !ohgod
      });

      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 3);
      assert.equal(analysis.getDynamicStyles().size, 2);
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
      import bar, { states as barStates } from 'bar.block.css';
      import objstr from 'obj-str';
      let ohgod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty[barStates.awesome]]: ohgod
      });
      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 2);
      assert.equal(analysis.getDynamicStyles().size, 1);
    });
  }

  @test 'Accessing substate on boolean state throws'(){
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
      import bar, { states as barStates } from 'bar.block.css';
      import objstr from 'obj-str';
      let ohgod = true;
      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty[barStates.awesome.wat]]: ohgod
      });
      <div class={style}></div>;
    `).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 2);
      assert.equal(analysis.getDynamicStyles().size, 1);
    }).catch((err) => {
      assert.equal(err.message, 'No state [state|awesome=wat] found on block "bar".\n  Did you mean: .pretty[state|awesome]?');
    });
  }

}
