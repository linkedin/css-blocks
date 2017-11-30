import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | Inline Root Styles')
export class Test {
  after() {
    mock.restore();
  }

  @test 'Elements with root applied are tracked on attribute `class`'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}></div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Root block styles may be applied with `.root` on attribute `class`'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar.root}></div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Elements with root applied are tracked on attribute `className`'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar}></div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Root block styles may be applied with `.root` on attribute `className`'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar.root}></div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

  @test 'Root block styles are deduped if applied to multiple valid properties'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar} className={bar}></div> );
      }`
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(analysis.stylesFound, ['bar.root']);
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
    });
  }

}
