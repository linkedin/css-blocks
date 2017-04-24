//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import cssBlocks from "../src/css-blocks";
import { assert } from "chai";
 
@suite class Hello {
  @test "world!"() {
    assert.equal(cssBlocks(), "hello world!");
  }
}
