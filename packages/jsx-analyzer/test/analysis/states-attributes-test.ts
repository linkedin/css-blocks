import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import Analysis from '../../src/Analysis';
import { parse } from "../../src/index";

var mock = require('mock-fs');

@suite("Dynamic Styles")
export class Test {

  @test "States with substates are tracked"(){
    mock({
      "bar.block.css": `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} bar.pretty:color="yellow"></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "When provided state value is string literal, only the corresponding state is registered"(){
    mock({
      "bar.block.css": `
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
      <div class={bar.pretty} bar.pretty:color="green"></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "When provided state value is dynamic, all states in the group are registered"(){
    mock({
      "bar.block.css": `
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
      <div class={bar.pretty} bar.pretty:color={ohgod}></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 3);
      assert.equal(analysis.dynamicStyles.size, 2);
    });
  }

  @test "Boolean states with no value only ever register the one state and are never dynamic"(){
    mock({
      "bar.block.css": `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} bar.pretty:awesome ></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "Boolean states with a literal value only ever register the one state and are not dynamic"(){
    mock({
      "bar.block.css": `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} bar.pretty:awesome="true"></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      assert.equal(analysis.dynamicStyles.size, 0);
    });
  }

  @test "Boolean states with a dynamic value only ever register the one state and are dynamic"(){
    mock({
      "bar.block.css": `
        .root { color: blue; }
        .pretty { color: red; }
        .pretty[state|awesome] {
          color: yellow;
        }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={bar.pretty} bar.pretty:awesome={ohmy}></div>;
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      assert.equal(analysis.dynamicStyles.size, 1);
    });
  }
}
