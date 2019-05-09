import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { Expression, OP_CODE } from "../src/constructor";
import { runtime } from "../src/runtime";

@suite("Expression")
export class ExpressionTests {

  @test "simple equality expression"() {
    let expr = new Expression();
    // arg0 === arg1
    expr.apply("fubar").when(true).equals.val(false);
    assert.deepEqual(expr.getClasses(), ["fubar"]);
    assert.deepEqual(expr.getExprs(), [true, false]);
    assert.deepEqual(expr.getOps(), [OP_CODE.VAL, "0", OP_CODE.EQUAL, OP_CODE.VAL, "1"]);
    assert.deepEqual([parseInt(`1${expr.getOps().join("").split("").reverse().join("")}`, 2).toString(36)], expr.getShape());
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false]), "");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true]), "fubar");
  }

  @test "simple not expression"() {
    let expr = new Expression();
    // arg0 === !arg1
    expr.apply("fubar").when(true).equals.not.val(false);
    assert.deepEqual(expr.getClasses(), ["fubar"]);
    assert.deepEqual(expr.getExprs(), [true, false]);
    assert.deepEqual(expr.getOps(), [OP_CODE.VAL, "0", OP_CODE.EQUAL, OP_CODE.NOT, OP_CODE.VAL, "1"]);
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false]), "fubar");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true]), "");
  }

  @test "multiple classes"() {
    // arg0 === !arg1 => fubar
    // arg0 === arg2 => bizbaz
    let expr = new Expression();
    expr.apply("fubar").when("arg0").equals.not.val("arg1");
    expr.apply("bizbaz").when("arg0").equals.val("arg2");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, false]), "fubar", "1 0 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, true]), "fubar bizbaz", "1 0 1");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, false, true]), "", "0 0 1");
  }

  @test "expressions with parens"() {
    // arg0 === (arg1 || arg2) => fubar
    // (arg0 === arg1) || arg2 => bizbaz
    let expr = new Expression();
    expr = expr.apply("fubar").when("arg0").equals.open.val("arg1").or.val("arg2").close;
    expr.apply("bizbaz").open.when("arg0").equals.val("arg1").close.or.val("arg2");

    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, false, false]), "fubar bizbaz", "0 0 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, false]), "", "1 0 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, true, false]), "", "0 1 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, true, true]), "bizbaz", "0 0 1");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true, false]), "fubar bizbaz", "1 1 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, true]), "fubar bizbaz", "1 0 1");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, true]), "fubar bizbaz", "1 1 1");
  }

  @test "deep stack expressions"() {
    // arg0 && (arg1 || !(arg0 && arg2)) => fubar
    let expr = new Expression();
    expr = expr.apply("fubar").when("arg0").and.open.val("arg1").or.not.open.val("arg0").and.val("arg2").close.close;

    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, false, false]), "", "0 0 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, false]), "fubar", "1 0 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, true, false]), "", "0 1 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, true, true]), "", "0 0 1");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true, false]), "fubar", "1 1 0");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, true]), "", "1 0 1");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true, true]), "fubar", "1 1 1");

  }
}
