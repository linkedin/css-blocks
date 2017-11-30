import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | Inline Class Styles')
export class Test {
  after() {
    mock.restore();
  }

  @test 'Elements with classes applied are tracked'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}> <div class={bar.foo}> </div> </div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ['bar.foo', 'bar.root']);
      assert.deepEqual(analysis.elements.a.staticStyles, [1]);
      assert.deepEqual(analysis.elements.b.staticStyles, [0]);
    });
  }

  @test 'Elements with classes applied are tracked on property "className"'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar}> <div className={bar.foo}> </div> </div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ['bar.foo', 'bar.root']);
      assert.deepEqual(analysis.elements.a.staticStyles, [1]);
      assert.deepEqual(analysis.elements.b.staticStyles, [0]);
    });
  }

  @test 'Unrecognized classes throw'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; } .bar { float: left; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}> <div class={bar.baz}> </div> </div> );
      }`
    ).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No class named "baz" found on block "bar". Did you mean one of: .foo, .bar (4:47)');
    });
  }

  @test 'Throw when referencing non-existent sub-state'() {
    mock({
      'bar.block.css': `
        .root { color: red; }
        .foo { color: blue; }
        .baz { color: yellow; }
        .foo[state|baz] { color: red; }`
    });

    return parse(`
      import bar from 'bar.block.css';
      function render(){
        return ( <div class={bar}> <div class={bar.foo.baz.biz}> </div> </div> );
      }`
    ).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No state [state|baz=biz] found on block "bar".\n  Did you mean: .foo[state|baz]? (4:47)');
    });
  }
}
