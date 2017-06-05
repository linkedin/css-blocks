import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import parser from "../src/index";
import StyleAnalysis from '../src/StyleAnalysis';
import { Block } from "css-blocks";

var mock = require('mock-fs');

@suite("Block Importer")
export class Test {

  @test "imports for non-css-block related files are ignored"(){
    parser({
      string: `import foo from 'bar';`
    }).then((analysis: StyleAnalysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 0);
    });
  }

  @test "imports for css-block files are registered using default syntax"(){
    mock({
      "bar.block.css": ".root { color: red; }",
    });
    return parser({
      string: `import bar from 'bar.block.css';`
    }).then((analysis: StyleAnalysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.blocks['bar'].constructor, Block);
    });
  }

  @test "imports for css-block files are registered using 'as' syntax"(){
    mock({
      "bar.block.css": ".root { color: red; }",
    });
    parser({
      string: `import * as bar from 'bar.block.css';`
    }).then((analysis: StyleAnalysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.blocks['bar'].constructor, Block);
    });
  }

  @test "imports for multiple css-block files are registered"(){
    mock({
      "bar.block.css": ".root { color: red; }",
      "baz.block.css": ".root { color: blue; }"
    });
    parser({
      string: `import * as bar from 'bar.block.css';\nimport baz from 'baz.block.css';`
    }).then((analysis: StyleAnalysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.blocks['bar'].constructor, Block);
      assert.equal(analysis.blocks['baz'].constructor, Block);
    });
  }

}
