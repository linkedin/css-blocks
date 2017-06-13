import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import Analysis from '../../src/Analysis';
import JSXOpeningElement from "../../src/analyzer/JSXOpeningElement";
import { parse } from "../../src/index";

var mock = require('mock-fs');

@suite("Inline Root Styles")
export class Test {
  @test "exists"() {
    assert.equal(typeof JSXOpeningElement, 'function');
  }

  @test "Elements with root applied are tracked on attribute `class`"(){
    mock({
      "bar.block.css": ".root { color: red; } .foo { color: blue; }"
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar}></div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
    });
  }

  @test "Root block styles may be applied with `.root` on attribute `class`"(){
    mock({
      "bar.block.css": ".root { color: red; } .foo { color: blue; }"
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar.root}></div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "Elements with root applied are tracked on attribute `className`"(){
    mock({
      "bar.block.css": ".root { color: red; } .foo { color: blue; }"
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar}></div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "Root block styles may be applied with `.root` on attribute `className`"(){
    mock({
      "bar.block.css": ".root { color: red; } .foo { color: blue; }"
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div className={bar.root}></div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
    });
  }

  @test "Root block styles are deduped if applied to multiple valid properties"(){
    mock({
      "bar.block.css": ".root { color: red; } .foo { color: blue; }"
    });

    return parse(`
      import bar from 'bar.block.css'
      function render(){
        return ( <div class={bar} className={bar}></div> );
      }`
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
    });
  }



}
