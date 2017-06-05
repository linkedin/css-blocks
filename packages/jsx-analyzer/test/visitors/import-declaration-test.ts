import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import ImportDeclaration from "../../src/visitors/ImportDeclaration";
import parser from "../../src/index";
import StyleAnalysis from '../../src/StyleAnalysis';

var mock = require('mock-fs');

@suite("ImportDeclaration visitor")
export class Test {

  @test "exists"() {
    assert.equal(typeof ImportDeclaration, 'function');
  }

  @test "imports for non-css-block related files are ignored"(){
    return parser({
      string: `import foo from 'bar';`
    }).then((analysis: StyleAnalysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 0);
      assert.equal(analysis.apiName, undefined);
    });;
  }

  @test "imports for css-blocks API is handled"(){
    return parser({
      string: `import style from 'css-blocks';`
    }).then((analysis: StyleAnalysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 0);
      assert.equal(analysis.apiName, 'style');
    });;
  }

  @test "imports for css-blocks API is handled with different name"(){
    return parser({
      string: `import snowflake from 'css-blocks';`
    }).then((analysis: StyleAnalysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 0);
      assert.equal(analysis.apiName, 'snowflake');
    });;
  }

  @test "imports for css-blocks API is handled using 'as' syntas"(){
    return parser({
      string: `import * as snowflake from 'css-blocks';`
    }).then((analysis: StyleAnalysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 0);
      assert.equal(analysis.apiName, 'snowflake');
    });;
  }

  @test "file with multiple imports still registers api name"(){
    mock({
      "bar.block.css": ".root { color: red; }",
      "baz.block.css": ".root { color: blue; }"
    });
    parser({
      string: `import * as bar from 'bar.block.css';\nimport foo from 'bar';\nimport snowflake from 'css-blocks';\nimport baz from 'baz.block.css';`
    }).then((analysis: StyleAnalysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.apiName, 'snowflake');
    });
  }

}
