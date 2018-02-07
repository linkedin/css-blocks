import { assert } from 'chai';
import { skip, suite, test } from 'mocha-typescript';

import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

// This suite is skipped because we don't currently support state attributes because jsx parser doesn't support it
// and we don't want to use a fork.
@suite('Analyzer | State Attributes')
export class Test {
  after() {
    mock.restore();
  }

  @skip @test 'States with sub-states are tracked'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.color='yellow'></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @skip @test 'When provided state value is string literal, only the corresponding state is registered'() {
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
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.color='green'></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @skip @test 'When provided state value is dynamic, all states in the group are registered'() {
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
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.color={leSigh}></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 3);
      assert.equal(analysis.dynamicCount(), 2);
    });
  }

  @skip @test 'Boolean states with no value only ever register the one state and are never dynamic'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.awesome ></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @skip @test 'Boolean states with a literal value only ever register the one state and are not dynamic'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.awesome='true'></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @skip @test 'Boolean states with a dynamic value only ever register the one state and are dynamic'() {
    mock({
      'bar.block.css': `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} state:bar.pretty.awesome={ohMy}></div>;
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      assert.equal(analysis.dynamicCount(), 1);
    });
  }
}
