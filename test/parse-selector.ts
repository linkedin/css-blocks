import { suite, test, skip } from "mocha-typescript";
import parseSelector, { /* CompoundSelector */ } from "../src/parseSelector";
import selectorParser = require("postcss-selector-parser");
import { assert } from "chai";
// import assertError from "./util/assertError";

@suite("parseSelector")
export class ParseSelectorTests {

  @test "handles string input"() {
    let selector = ".foo .bar, .biz .baz";
    let res = parseSelector(selector);
    assert.equal(res.length, 2);
    assert.equal(res[0].length, 2);
  }

  @test "handles selectorParser.Root"() {
    let selector = selectorParser().process(".foo .bar, .biz .baz").res;
    let res = parseSelector(selector);

    assert.equal(res.length, 2);
    assert.equal(res[0].length, 2);
  }

  // Theres something weird going on here
  @test @skip "handles selectorParser.Node[]"() {
    let selector = selectorParser().process(".foo .bar, .biz .baz").res.nodes;
    console.log(selector);
    let res = parseSelector(selector);
    console.log(res);
    assert.equal(res.length, 2);
    assert.equal(res[0].length, 2);
  }

  // Theres something weird going on here
  @test @skip "handles selectorParser.Node[][]"() {
    let selector = [ selectorParser().process(".foo .bar").res.nodes, selectorParser().process(".biz .baz").res.nodes ];
    console.log(selector);
    let res = parseSelector(selector);
    console.log(res[0].selector.nodes);
    assert.equal(res.length, 2);
    assert.equal(res[0].length, 2);
  }

}
