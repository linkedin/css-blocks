import { OP_CODE, runtime } from "./runtime";

// Convenience re-exports for ergonomic APIs (see test file).
export const OR  = OP_CODE.OR;
export const AND = OP_CODE.AND;
export const EQ  = OP_CODE.EQUAL;
export const NOT = (val: Value | Expression) => ({ val, not: true });

// Maps OP_CODE values to human readable strings.
const OP_STR = {
  [OR]: "OR",
  [AND]: "AND",
  [EQ]: "EQ",
  [OP_CODE.SEP]: "SEP",
};

// The index of an input value to be resolved at runtime.
export type Value = number;

// Represents the inversion of a resolved or computed value.
export interface NotValue {
  val: Value | Expression;
  not: boolean;
}

/**
 * Determine if a provided value is a `NotValue` interface.
 * @param v Any value.
 */
function isNotValue(v: unknown): v is NotValue { return v && (v as NotValue).hasOwnProperty("val") && (v as NotValue).hasOwnProperty("not"); }

/**
 * Represents a single node in a boolean expression binary tree.
 */
export interface Expression {
  left: Expression | Value;
  notLeft: boolean;
  op: OP_CODE;
  right: Expression | Value;
  notRight: boolean;
}

// Valid operand values for our expr() function.
export type Operand = Value | Expression | NotValue;

/**
 * SimpleExpression objects are a special representation of Expressions
 * that will only reference resolved values at runtime. They are completely flat.
 */
export interface SimpleExpression extends Expression {
  left: Value;
  right: Value;
}

/**
 * The flattened representation of an Expression binary tree.
 * This is converted basically 1:1 to the binary runtime shapes.
 */
export interface Flattened {
  arguments: Set<number>;
  expressions: SimpleExpression[];
  indices: Map<string, number>;
}

/**
 * Given a left operand, opcode, and right expression, return an expression object.
 * Left and right operands may be the index of an input value, a `NotValue` expression,
 * or another Expression object, making this a very fancy binary tree.
 * @param left The Left Operand
 * @param op OP_CODE to process left and right with
 * @param right The Right Operand.
 */
export function expr(left: Operand, op: OP_CODE, right: Operand): Expression {
  let notLeft = false;
  let notRight = false;
  if (isNotValue(left)) {
    notLeft = left.not;
    left = left.val;
  }
  if (isNotValue(right)) {
    notRight = right.not;
    right = right.val;
  }
  return { left, op, right, notLeft, notRight };
}

/**
 * Generate a string UID for any SimpleExpression.
 * @param expr The SimpleExpression we're generating a UID for.
 */
function genUid(expr: SimpleExpression): string {
  return `VAR ${expr.notLeft ? "!" : ""}${expr.left} ${OP_STR[expr.op]} VAR ${expr.notRight ? "!" : ""}${expr.right}`;
}

/**
 * Discover all `Value`s referenced in a boolean Expression tree.
 * @param expr The Expression tree to crawl.
 * @param out The Flattened output object to read values in to.
 */
function getArgs(expr: Expression, out: Flattened) {
  if (typeof expr.left === "number") { out.arguments.add(expr.left); }
  else { getArgs(expr.left, out); }

  if (typeof expr.right === "number") { out.arguments.add(expr.right); }
  else { getArgs(expr.right, out); }
}

/**
 * Provided an Expression binary tree, read all values in to the Flattened data object.
 * @param expr The Expression tree to crawl.
 * @param out The Flattened object to read data in to.
 */
function visit(expr: Expression, out: Flattened): number {

  // Convert this expression to a SimpleExpression
  let simpleExpr: SimpleExpression = {
    left: (typeof expr.left  !== "number") ? visit(expr.left, out) : expr.left,
    right: (typeof expr.right  !== "number") ? visit(expr.right, out) : expr.right,
    op: expr.op,
    notLeft: expr.notLeft,
    notRight: expr.notRight,
  };

  // Generate a UID for this expression.
  let uid = genUid(simpleExpr);

  // Save this expression in the simple expressions array, if an equivalent expression is not there.
  if (!out.indices.has(uid)) {
    out.expressions.push(simpleExpr);
    out.indices.set(uid, out.expressions.length - 1);
  }

  // Return the expression's index reference.
  return out.indices.get(uid)! + out.arguments.size;
}

/**
 * Flatten an ExpressionContainer object, reading values in to a Flattened data structure.
 * @param el The ExpressionContainer to flatten.
 */
function flattenExpressions(el: ExpressionContainer): Flattened {
  const out: Flattened = {
    arguments: new Set(),
    expressions: [],
    indices: new Map(),
  };

  // Fetch all referenced args.
  el.forEachClass((_c, e) => getArgs(e, out));

  // For every root note, crawl its descendents and populate the Flattened object
  // with the used expressions.
  const classExprs = el.getExprs().map((expr): SimpleExpression => ({
    left: (typeof expr.left  !== "number") ? visit(expr.left, out) : expr.left,
    right: (typeof expr.right  !== "number") ? visit(expr.right, out) : expr.right,
    op: expr.op,
    notLeft: expr.notLeft,
    notRight: expr.notRight,
  }));

  // Ensure all classExpr root nodes are at the end of the Flattened expression list.
  out.expressions = [...out.expressions, ...classExprs];

  return out;
}

export class ExpressionContainer {

  private classes: {[key: string]: Expression} = {};

  /**
   * Add a new class to this ExpressionContainer.
   * @param name The class name we're determining presence for.
   * @param expr The Expression that evaluates to true or false, representing class application.
   */
  class(name: string, expr: Expression) { this.classes[name] = expr; }

  /**
   * Iterate over all classes stored on this ExpressionContainer.
   * @param cb forEachClass callback function. Passed the class name, and Expression.
   */
  forEachClass(cb: (c: string, e: Expression) => void): ExpressionContainer {
    for (let key of Object.keys(this.classes)) { cb(key, this.classes[key]); }
    return this;
  }

  // Expression and Class introspection methods.
  getExprs(): Expression[] { return Object.values(this.classes); }
  getClasses(): string[]   { return Object.keys(this.classes);   }

  /**
   * Get the binary string (ex: "1001001001010") that represents all the registered classes'
   * application logic in this ExpressionContainer.
   */
  getBinaryString(): string {
    const flattened = flattenExpressions(this);
    const argCount = flattened.arguments.size;
    const classesCount = Object.keys(this.classes).length;
    let exprCount = 0;
    let out = "";
    for (let idx = 0; idx < flattened.expressions.length; idx++) {
      let expr = flattened.expressions[idx];
      let isSep = (flattened.expressions.length - classesCount) === idx;
      let size = ~~Math.log2(exprCount + argCount - 1) + 1;
      let left  = expr.left.toString(2).padStart(size, "0") + (expr.notLeft ? "1" : "0");
      let op    = expr.op.toString(2).padStart(2, "0");
      let right = expr.right.toString(2).padStart(size, "0") + (expr.notRight ? "1" : "0");
      out += (isSep ? OP_CODE.SEP.toString(2) : "") + op + left + right;
      exprCount++;
      // console.log(`${genUid(expr)}:`, op, left, right);
    }

    return out;
  }

  /**
   * Calculate the base36 binary string encoding of this expression's logic shape.
   */
  getBinaryEncoding(): string[] {
    return this.getBinaryString().match(/.{1,32}/g)!.map((s) => parseInt(s.split("").reverse().join(""), 2).toString(36));
  }

  /**
   * Convenience method to test class application. Calls the binary runtime using
   * the binary encoded expression shapes and provided arguments.
   * @param args Arguments to evaluate this expression using.
   */
  exec(...args: unknown[]) {
    return runtime(this.getBinaryEncoding(), this.getClasses(), args);
  }
}
