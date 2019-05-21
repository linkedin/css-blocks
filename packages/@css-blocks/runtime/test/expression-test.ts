import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import {
  AND,
  EQ,
  ExpressionContainer,
  NOT,
  OR,
  expr,
} from "../src/ExpressionContainer";

@suite("Expression Build")
export class ExpressionBuildTests {

  @test "Binary string and encoding generation properly"() {
    // arg0 === (arg1 || arg2) => fubar
    let el = new ExpressionContainer();
    el.class("fubar", expr(0, EQ, expr(1, OR, 2)));
    assert.equal(el.getBinaryString(), "000101001110000110");
    assert.deepEqual(el.getBinaryEncoding(), [parseInt(el.getBinaryString().split("").reverse().join(""), 2).toString(36)]);
  }

  @test "simple equality expression"() {
    // 0 == 1
    let el = new ExpressionContainer();
    el.class("zipzap", expr(0, EQ, 1));
    assert.deepEqual(el.getExprs(), [{
      left: 0,
      op: EQ,
      right: 1,
      notLeft: false,
      notRight: false,
    }]);
    assert.equal(el.exec(true, false), "");
    assert.equal(el.exec(true, true), "zipzap");
    assert.equal(el.exec(false, false), "zipzap");
  }

  @test "simple not expression"() {
    let el = new ExpressionContainer();
    // arg0 === !arg1
    el.class("fubar", expr(0, EQ, NOT(1)));
    assert.equal(el.exec(true, false), "fubar");
    assert.equal(el.exec(true, true), "");
  }

  @test "deep expression with NOTs"() {
    // !(0 || 1) && !2
    let el = new ExpressionContainer();
    el.class("zipzap", expr(NOT(expr(0, OR, 1)), AND, NOT(2)));
    assert.deepEqual(el.getExprs(), [{
      left: {
        left: 0,
        op: OR,
        right: 1,
        notLeft: false,
        notRight: false,
      },
      op: AND,
      right: 2,
      notLeft: true,
      notRight: true,
    }]);
  }

  @test "multiple classes"() {
    // arg0 === !arg1 => fubar
    // arg0 === arg2 => bizbaz
    let el = new ExpressionContainer();
    el.class("fubar", expr(0, EQ, NOT(1)));
    el.class("bizbaz", expr(0, EQ, 2));
    assert.equal(el.exec(true, false, false), "fubar", "1 0 0");
    assert.equal(el.exec(true, false, true), "fubar bizbaz", "1 0 1");
    assert.equal(el.exec(false, false, true), "", "0 0 1");
  }

  @test "expressions with parens"() {
    // arg0 === (arg1 || arg2) => fubar
    // (arg0 === arg1) || arg2 => bizbaz
    let el = new ExpressionContainer();
    el.class("fubar", expr(0, EQ, expr(1, OR, 2)));
    el.class("bizbaz", expr(expr(0, EQ, 1), OR, 2));

    assert.equal(el.exec(false, false, false), "fubar bizbaz", "0 0 0");
    assert.equal(el.exec(true, false, false), "", "1 0 0");
    assert.equal(el.exec(false, true, false), "", "0 1 0");
    assert.equal(el.exec(false, true, true), "bizbaz", "0 0 1");
    assert.equal(el.exec(true, true, false), "fubar bizbaz", "1 1 0");
    assert.equal(el.exec(true, false, true), "fubar bizbaz", "1 0 1");
    assert.equal(el.exec(true, false, true), "fubar bizbaz", "1 1 1");
  }

  @test "deep stack expressions"() {
    // arg0 && (arg1 || !(arg0 && arg2)) => fubar
    let el = new ExpressionContainer();
    el.class("fubar", expr(0, AND, expr(1, OR, NOT(expr(0, AND, 2)))));

    assert.equal(el.exec(false, false, false), "", "0 0 0");
    assert.equal(el.exec(true, false, false), "fubar", "1 0 0");
    assert.equal(el.exec(false, true, false), "", "0 1 0");
    assert.equal(el.exec(false, true, true), "", "0 0 1");
    assert.equal(el.exec(true, true, false), "fubar", "1 1 0");
    assert.equal(el.exec(true, false, true), "", "1 0 1");
    assert.equal(el.exec(true, true, true), "fubar", "1 1 1");
  }
}
