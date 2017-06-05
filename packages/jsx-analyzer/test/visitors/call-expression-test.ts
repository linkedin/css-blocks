import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import CallExpression from "../../src/visitors/CallExpression";
import parser from "../../src/index";

// var mock = require('mock-fs');

@suite("CallExpression visitor")
export class Test {
  @test "exists"() {
    assert.equal(typeof CallExpression, 'function');
  }

  @test "imports for non-css-block related files are ignored"(){
    parser({
      string: `foo();`
    });
  }

}
