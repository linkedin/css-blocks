import { assert } from 'chai';
import { suite, test, skip } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | Inline Class Styles')
export class Test {

  @skip
  @test 'Elements with classes applied are tracked'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}> <div class={bar.foo}> </div> </div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      // let styleIter = analysis.getAnalysis(0).stylesFound.entries();
      // assert.equal(styleIter.next().value[0].asSource(), '.root');
      // assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.getAnalysis(0).elementCount(), 2);
      assert.equal(analysis.getAnalysis(0).getElement(0).static.size, 1);
      assert.equal(analysis.getAnalysis(0).getElement(1).static.size, 1);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @skip
  @test 'Elements with classes applied are tracked on property "className"'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar}> <div className={bar.foo}> </div> </div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      // TODO
      // let styleIter = analysis.getAnalysis(0).stylesFound.entries();
      // assert.equal(styleIter.next().value[0].asSource(), '.root');
      // assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.getAnalysis(0).elementCount(), 2);
      assert.equal(analysis.getAnalysis(0).getElement(0).static.size, 1);
      assert.equal(analysis.getAnalysis(0).getElement(1).static.size, 1);
      assert.equal(analysis.dynamicCount(), 0);
    });
  }

  @test 'Unrecognized classes throw'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}> <div class={bar.baz}> </div> </div> );
      }`
    ).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No class named "baz" found on block "bar" (4:4)');
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
      assert.equal(err.message, '[css-blocks] MalformedBlockPath: No state [state|baz=biz] found on block "bar".\n  Did you mean: .foo[state|baz]? (4:4)');
    });
  }
}
