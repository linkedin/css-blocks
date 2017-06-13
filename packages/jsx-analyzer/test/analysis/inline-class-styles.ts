import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import Analysis from '../../src/Analysis';
import { parse } from '../../src/index';

const mock = require('mock-fs');

@suite('Inline Class Styles')
export class Test {

  @test 'Elements with classes applied are tracked'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}> <div class={bar.foo}> </div> </div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      let styleIter = analysis.stylesFound.entries();
      assert.equal(styleIter.next().value[0].asSource(), '.root');
      assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.styleCorrelations.length, 2);
      assert.equal(analysis.styleCorrelations[0].size, 1);
      assert.equal(analysis.styleCorrelations[1].size, 1);
      assert.equal(analysis.dynamicStyles.size, 0);
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
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      let styleIter = analysis.stylesFound.entries();
      assert.equal(styleIter.next().value[0].asSource(), '.root');
      assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.styleCorrelations.length, 2);
      assert.equal(analysis.styleCorrelations[0].size, 1);
      assert.equal(analysis.styleCorrelations[1].size, 1);
      assert.equal(analysis.dynamicStyles.size, 0);
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
      assert.equal(err.message, 'No class named "baz" found on block "bar"');
    });
  }

  @test 'Throw when referencing block object out of depth'() {
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
        return ( <div class={bar}> <div class={bar.foo.baz}> </div> </div> );
      }`
    ).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Attempted to access non-existant block class or state "bar.foo.baz"');
    });
  }
}
