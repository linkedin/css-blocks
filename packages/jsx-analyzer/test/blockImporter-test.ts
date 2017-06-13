import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { parse } from "../src/index";
import Analysis from '../src/Analysis';
import { Block } from "css-blocks";

var mock = require('mock-fs');

@suite("Block Importer")
export class Test {

  @test "imports for non-css-block related files are ignored"(){
    parse(`import foo from 'bar';`).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 0);
    });
  }

  @test "imports for css-block files are registered using default syntax"(){
    mock({
      "bar.block.css": ".root { color: red; }",
    });
    return parse(`import bar from 'bar.block.css';`).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.blocks['bar'].constructor, Block);
    });
  }

  @test "imports for css-block files are registered using 'as' syntax"(){
    mock({
      "bar.block.css": ".root { color: red; }",
    });
    parse(`import * as bar from 'bar.block.css';`).then((analysis: Analysis) => {
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
    parse(`
      import * as bar from 'bar.block.css';
      import baz from 'baz.block.css';
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.blocks['bar'].constructor, Block);
      assert.equal(analysis.blocks['baz'].constructor, Block);
    });
  }

  @test "imported blocks may be renamed locally"(){
    mock({
      "bar.block.css": ".root { color: red; }",
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import * as foo from 'bar.block.css';
      import biz from 'baz.block.css';
    `).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.blocks['bar'], analysis.localBlocks['foo']);
      assert.equal(analysis.blocks['baz'], analysis.localBlocks['biz']);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Function Declaration"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      () => {
        function biz(){};
      }
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Variable Declaration"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      () => {
        let biz = 'test';
      }
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Class Name"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      () => {
        class biz {};
      }
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Function Param"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      (biz) => {

      }
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Class Method Param"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      class Test {
        method(biz){}
      }
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Object Method Param"(){
    mock({
      "baz.block.css": ".root { color: blue; }"
    });
    parse(`
      import biz from 'baz.block.css';
      let obj = {
        method(biz){}
      };
    `).then(() => {
      assert.equal('Should never get here', '');
    }).catch((err: Error) => {
      assert.equal(err.message, 'Block identifier "biz" cannot be re-defined in any scope once imported.');
    });
  }

}
