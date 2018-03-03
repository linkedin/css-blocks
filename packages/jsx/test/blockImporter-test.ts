import { assert } from "chai";
import { Block } from "css-blocks";
import { suite, test } from "mocha-typescript";

import { MetaAnalysis } from "../src/utils/Analysis";

import { testParse as parse } from "./util";

const mock = require("mock-fs");

@suite("Block Importer")
export class Test {
  after() {
    mock.restore();
  }

  @test "imports for non-css-block related files are ignored"() {
    return parse(`import foo from 'bar';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 0);
    });
  }

  @test "imports for css-block files are registered using default syntax"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
    });
    return parse(`import bar from 'bar.block.css';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
    });
  }

  @test "imports for css-block files are registered using explicit default import"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
    });
    return parse(`import { default as bar } from 'bar.block.css';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
    });
  }

  @test "imports for css-block files register explicit state object import"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
    });
    return parse(`import bar from 'bar.block.css';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
    });
  }

  @test "imports for css-block files register explicit state object import with explicit default import"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
    });
    return parse(`import { default as bar } from 'bar.block.css';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
    });
  }

  @test 'imports for css-block files are registered using "as" syntax'() {
    mock({
      "bar.block.css": ":scope { color: red; }",
    });
    return parse(`import * as bar from 'bar.block.css';`).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
    });
  }

  @test "imports for multiple css-block files are registered"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import * as bar from 'bar.block.css';
      import baz from 'baz.block.css';
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 2);
      assert.equal(analysis.getAnalysis(0).blocks["bar"].constructor, Block);
      assert.equal(analysis.getAnalysis(0).blocks["baz"].constructor, Block);
    });
  }

  @test "imported blocks may be renamed locally"() {
    mock({
      "bar.block.css": ":scope { color: red; }",
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import * as foo from 'bar.block.css';
      import biz from 'baz.block.css';
    `).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 2);
      assert.ok(analysis.getAnalysis(0).blocks["foo"]);
      assert.ok(analysis.getAnalysis(0).blocks["biz"]);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Function Declaration"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      () => {
        function biz(){};
      }
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (4:8)`);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Variable Declaration"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      () => {
        let biz = 'test';
      }
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (4:8)`);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Class Name"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      () => {
        class biz {};
      }
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (4:8)`);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Function Param"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      (biz) => {

      }
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (3:6)`);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Class Method Param"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      class Test {
        method(biz){}
      }
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (4:8)`);
    });
  }

  @test "block identifiers may not be re-declaired elsewhere in the file – Object Method Param"() {
    mock({
      "baz.block.css": ":scope { color: blue; }",
    });
    return parse(`
      import biz from 'baz.block.css';
      let obj = {
        method(biz){}
      };
    `).then(() => {
      assert.equal("Should never get here", "");
    }).catch((err: Error) => {
      assert.equal(err.message, `[css-blocks] ImportError: Block identifier "biz" cannot be re-defined in any scope once imported. (4:8)`);
    });
  }
}
