import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { Expression, OP_CODE } from "../src/constructor";
import { runtime } from "../src/runtime";

@suite("Expression")
export class ExpressionTests {

  @test "simple equality expression"() {
    let expr = new Expression();
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
    expr.apply("fubar").when(true).equals.not(false);
    assert.deepEqual(expr.getClasses(), ["fubar"]);
    assert.deepEqual(expr.getExprs(), [true, false]);
    assert.deepEqual(expr.getOps(), [OP_CODE.VAL, "0", OP_CODE.EQUAL, OP_CODE.NOT, OP_CODE.VAL, "1"]);
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false]), "fubar");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, true]), "");
  }

  @test "multiple classes"() {
    let expr = new Expression();
    expr.apply("fubar").when("arg0").equals.not("arg1");
    expr.apply("bizbaz").when("arg0").equals.val("arg2");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, false]), "fubar");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [true, false, true]), "fubar bizbaz");
    assert.equal(runtime(expr.getShape(), expr.getClasses(), [false, false, true]), "");
  }
}
