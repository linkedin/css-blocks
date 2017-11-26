import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";

import { Block } from "../src/Block";

@suite("Block object lookup")
export class LookupTests {
  @test "finds the block"() {
    let block = new Block("test", "test.block.css");
    let found = block.lookup(".root");
    assert.deepEqual(block, found);
  }
  @test "finds a state"() {
    let block = new Block("test", "test.block.css");
    let state = block.states._ensureState({name: "foo"});
    let found = block.lookup("[state|foo]");
    assert.deepEqual(state, found);
  }
  @test "finds an exclusive state"() {
    let block = new Block("test", "test.block.css");
    let state = block.states._ensureState({name: "bar", group: "foo"});
    let found = block.lookup("[state|foo=bar]");
    assert.deepEqual(state, found);
  }
  @test "finds a class"() {
    let block = new Block("test", "test.block.css");
    let klass = block.ensureClass("bar");
    let found = block.lookup(".bar");
    assert.deepEqual(klass, found);
  }
  @test "finds a class state"() {
    let block = new Block("test", "test.block.css");
    let klass = block.ensureClass("foo");
    let state = klass.states._ensureState({name: "a"});
    let found = block.lookup(".foo[state|a]");
    assert.deepEqual(state, found);
  }
  @test "finds an exclusive class state"() {
    let block = new Block("test", "test.block.css");
    let klass = block.ensureClass("foo");
    let state = klass.states._ensureState({name: "a", group: "b"});
    let found = block.lookup(".foo[state|b=a]");
    assert.deepEqual(state, found);
  }
  @test "finds referenced blocks"() {
    let otherBlock = new Block("other", "other.block.css");
    let block = new Block("test", "test.block.css");
    block.addBlockReference("asdf", otherBlock);
    let found = block.lookup("asdf");
    assert.deepEqual(otherBlock, found);
    found = block.lookup("asdf.root");
    assert.deepEqual(otherBlock, found);
  }
  @test "finds referenced block class"() {
    let otherBlock = new Block("other", "other.block.css");
    let otherClass = otherBlock.ensureClass("foo");
    let block = new Block("test", "test.block.css");
    block.addBlockReference("asdf", otherBlock);
    let found = block.lookup("asdf.foo");
    assert.deepEqual(otherClass, found);
  }
}
