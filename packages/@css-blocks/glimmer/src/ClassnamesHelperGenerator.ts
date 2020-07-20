import {
  AndExpression,
  BlockClass,
  BooleanExpression,
  Conditional,
  Dependency,
  DynamicClasses,
  HasAttrValue,
  HasGroup,
  IndexedClassRewrite,
  NotExpression,
  OrExpression,
  Style,
  Switch,
  hasDependency,
  isConditional,
  isFalseCondition,
  isSwitch,
  isTrueCondition,
} from "@css-blocks/core";
import {
  AST,
  Syntax,
} from "@glimmer/syntax";
import {
  isAndExpression,
  isNotExpression,
  isOrExpression,
} from "@opticss/template-api";
import {
  assertNever,
  isSome,
  unwrap,
} from "@opticss/util";
import * as debugGenerator from "debug";

import {
  BooleanExpression as BooleanAST,
  StringExpression as StringAST,
  TemplateElement,
  TernaryExpression as TernaryAST,
} from "./ElementAnalyzer";
import { CLASSNAMES_HELPER_NAME, CONCAT_HELPER_NAME } from "./helpers";
import { isConcatStatement, isMustacheStatement, isPathExpression, isSubExpression } from "./utils";

const enum SourceExpression {
  ternary,
  dependency,
  boolean,
  booleanWithDep,
  switch,
  switchWithDep,
}

const enum FalsySwitchBehavior {
  error,
  unset,
  default,
}

const enum BooleanExpr {
  not = -1,
  or = -2,
  and = -3,
}

type Builders = Syntax["builders"];

const debug = debugGenerator("css-blocks:glimmer");

export function classnamesHelper(builders: Builders, rewrite: IndexedClassRewrite<Style>, element: TemplateElement): AST.MustacheStatement {
  return builders.mustache(
    builders.path(CLASSNAMES_HELPER_NAME),
    constructArgs(builders, rewrite, element),
  );
}

export function classnamesSubexpr(builders: Builders, rewrite: IndexedClassRewrite<Style>, element: TemplateElement): AST.SubExpression {
  return builders.sexpr(
    builders.path(CLASSNAMES_HELPER_NAME),
    constructArgs(builders, rewrite, element),
  );
}

// tslint:disable-next-line:prefer-unknown-to-any
function constructArgs(builders: Builders, rewrite: IndexedClassRewrite<any>, element: TemplateElement): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  expr.push(builders.number(element.dynamicClasses.length + element.dynamicAttributes.length));
  expr.push(builders.number(rewrite.dynamicClasses.length));
  expr.push(...constructSourceArgs(builders, rewrite, element));
  expr.push(...constructOutputArgs(builders, rewrite));
  return expr;
}

// tslint:disable-next-line:prefer-unknown-to-any
function constructSourceArgs(builders: Builders, rewrite: IndexedClassRewrite<any>, element: TemplateElement): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  for (let classes of element.dynamicClasses) {
    // type of expression
    expr.push(builders.number(SourceExpression.ternary));
    expr.push(...constructTernary(builders, classes, rewrite));
  }
  for (let stateExpr of element.dynamicAttributes) {
    if (isSwitch(stateExpr)) {
      if (hasDependency(stateExpr)) {
        expr.push(builders.number(SourceExpression.switchWithDep));
        expr.push(...constructDependency(builders, stateExpr, rewrite));
      } else {
        expr.push(builders.number(SourceExpression.switch));
      }
      expr.push(...constructSwitch(builders, stateExpr, rewrite));
    } else {
      let type = 0;
      if (hasDependency(stateExpr)) {
        type = type | SourceExpression.dependency;
      }
      if (isConditional(stateExpr)) {
        type = type | SourceExpression.boolean;
      }
      expr.push(builders.number(type));
      if (hasDependency(stateExpr)) {
        expr.push(...constructDependency(builders, stateExpr, rewrite));
      }
      if (isConditional(stateExpr)) {
        expr.push(...constructConditional(builders, stateExpr, rewrite));
      }
      expr.push(...constructStateReferences(builders, stateExpr, rewrite));
    }
  }
  return expr;
}

/**
 * Boolean Ternary:
 * 1: expression to evaluate as truthy
 * 2: number (t) of source styles set if true
 * 3..(3+t-1): indexes of source styles set if true
 * (3+t): number (f) of source styles set if false
 * (4+t)..(4+t+f-1): indexes of source styles set if false
 */
function constructTernary(builders: Builders, classes: DynamicClasses<TernaryAST>, rewrite: IndexedClassRewrite<Style>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  // The boolean expression
  if (isMustacheStatement(classes.condition!)) {
    expr.push(moustacheToExpression(builders, classes.condition));
  } else {
    expr.push(classes.condition!);
  }
  // The true styles
  if (isTrueCondition(classes)) {
    let trueClasses = resolveInheritance(classes.whenTrue, rewrite);
    expr.push(builders.number(trueClasses.length));
    expr.push(...trueClasses.map(style => {
      let n: number = unwrap(rewrite.indexOf(style));
      return builders.number(n);
    }));
  } else {
    expr.push(builders.number(0));
  }
  // The false styles
  if (isFalseCondition(classes)) {
    let falseClasses = resolveInheritance(classes.whenFalse, rewrite);
    expr.push(builders.number(falseClasses.length));
    expr.push(...falseClasses.map(style => builders.number(unwrap(rewrite.indexOf(style)))));
  } else {
    expr.push(builders.number(0));
  }
  return expr;
}

function resolveInheritance(classes: Array<BlockClass>, rewrite: IndexedClassRewrite<Style>) {
  let allClasses = [...classes];
  for (let c of classes) {
    allClasses.push(...c.resolveInheritance());
  }
  return allClasses.filter(c => isSome(rewrite.indexOf(c)));
}

/*
 * if conditional type has a dependency:
 *   3/4: number (d) of style indexes this is dependent on.
 *   4/5..((4/5)+d-1): style indexes that must be set for this to be true
 */
function constructDependency(builders: Builders, stateExpr: Dependency, rewrite: IndexedClassRewrite<Style>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  expr.push(builders.number(1));
  expr.push(builders.number(unwrap(rewrite.indexOf(stateExpr.container))));
  return expr;
}

function constructConditional(builders: Builders, stateExpr: Conditional<BooleanAST> & HasAttrValue, _rewrite: IndexedClassRewrite<Style>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  expr.push(moustacheToBooleanExpression(builders, stateExpr.condition));
  return expr;
}

function constructStateReferences(builders: Builders, stateExpr: HasAttrValue, rewrite: IndexedClassRewrite<Style>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  // TODO: inheritance
  expr.push(builders.number(stateExpr.value.size));
  for (let val of stateExpr.value) {
    expr.push(builders.number(unwrap(rewrite.indexOf(val))));
  }
  return expr;
}
/*
 * * String switch:
 * 1: conditional type: 4 - switch, 5 - both switch and dependency
 * if conditional type has a dependency:
 *   2: number (d) of style indexes this is dependent on.
 *   3..((3)+d-1): style indexes that must be set for this to be true
 * 1: number (n) of strings that can be returned
 * 2: whether a falsy value is an error (0), unsets the values (1)
 *    or provide a default (2) if a string
 * 3?: the default value if the falsy behavior is default (2)
 * then: expression to evaluate as a string
 * For each of the <n> strings that can be returned:
 *   1: string that can be returned by the expression
 *   2: number (s) of source styles set. s >= 1
 *   3..3+s-1: indexes of source styles set
 */
function constructSwitch(builders: Builders, stateExpr: Switch<StringAST> & HasGroup & HasAttrValue, rewrite: IndexedClassRewrite<Style>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  let values = Object.keys(stateExpr.group);
  expr.push(builders.number(values.length));
  if (stateExpr.disallowFalsy) {
    expr.push(builders.number(FalsySwitchBehavior.error));
  } else {
    expr.push(builders.number(FalsySwitchBehavior.unset));
  }
  expr.push(moustacheToStringExpression(builders, stateExpr.stringExpression!));
  for (let value of values) {
    let obj = stateExpr.group[value];
    expr.push(builders.string(value));
    // If there are values provided for this conditional, they are meant to be
    // applied instead of the selected attribute group member.
    if (stateExpr.value.size) {
      expr.push(builders.number(stateExpr.value.size));
      for (let val of stateExpr.value) {
        expr.push(builders.number(unwrap(rewrite.indexOf(val))));
      }
    }
    else {
      let styles = obj.resolveStyles();
      expr.push(builders.number(styles.size));
      for (let s of styles) {
        expr.push(builders.number(unwrap(rewrite.indexOf(s))));
      }
    }
  }
  return expr;
}

function moustacheToBooleanExpression(builders: Builders, booleanExpression: BooleanAST): AST.Expression {
  if (booleanExpression.type === "MustacheStatement") {
    return moustacheToExpression(builders, booleanExpression);
  } else {
    return booleanExpression;
  }
}

function moustacheToExpression(builders: Builders, expr: AST.MustacheStatement): AST.Expression {
  if (expr.path.type === "PathExpression") {
    if (expr.params.length === 0 && expr.hash.pairs.length === 0) {
      debug("converting", expr.path.original, "to path");
      return expr.path;
    } else {
      debug("converting", expr.path.original, "to sexpr");
      return builders.sexpr(expr.path, expr.params, expr.hash);
    }
  } else {
    debug("preserving literal", expr.path.original, "as literal");
    return expr.path;
  }
}

function moustacheToStringExpression(builders: Builders, stringExpression: Exclude<StringAST, null>): AST.Expression {
  if (isConcatStatement(stringExpression)) {
    return builders.sexpr(
      builders.path(CONCAT_HELPER_NAME),
      stringExpression.parts.reduce(
        (arr, val) => {
          if (val.type === "TextNode") {
            arr.push(builders.string(val.chars));
          } else {
            arr.push(val.path);
          }
          return arr;
        },
        new Array<AST.Expression>()));
  } else if (isSubExpression(stringExpression)) {
    return stringExpression;
  } else if (isPathExpression(stringExpression)) {
    return builders.sexpr(stringExpression);
  } else if (isMustacheStatement(stringExpression)) {
    return moustacheToExpression(builders, stringExpression);
  } else {
    return assertNever(stringExpression);
  }
}

// tslint:disable-next-line:prefer-unknown-to-any
function constructOutputArgs(builders: Builders, rewrite: IndexedClassRewrite<any>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  for (let out of rewrite.dynamicClasses) {
    expr.push(builders.string(out));
    expr.push(...constructBoolean(builders, rewrite.dynamicClass(out)!));
  }
  return expr;
}

type ConditionalArg = number | BooleanExpression<number>;

function constructBoolean(builders: Builders, bool: ConditionalArg): AST.Expression[] {
  if (typeof bool === "number") {
    return [builders.number(bool)];
  } else if (isAndExpression(bool)) {
    return constructAndExpression(builders, bool);
  } else if (isOrExpression(bool)) {
    return constructOrExpression(builders, bool);
  } else if (isNotExpression(bool)) {
    return constructNotExpression(builders, bool);
  } else {
    return assertNever(bool);
  }
}

function constructAndExpression(builders: Builders, bool: AndExpression<number>): AST.Expression[] {
  return constructConditionalExpression(builders, BooleanExpr.and, bool.and);
}
function constructOrExpression(builders: Builders, bool: OrExpression<number>): AST.Expression[] {
  return constructConditionalExpression(builders, BooleanExpr.or, bool.or);
}

function constructNotExpression(builders: Builders, bool: NotExpression<number>): AST.Expression[] {
  return [builders.number(BooleanExpr.not), ...constructBoolean(builders, bool.not)];
}
function constructConditionalExpression(builders: Builders, type: BooleanExpr, args: Array<ConditionalArg>): AST.Expression[] {
  let expr = new Array<AST.Expression>();
  if (args.length === 1) {
    let n = args[0];
    if (typeof n === "number") {
      expr.push(builders.number(n));
      return expr;
    }
  }
  expr.push(builders.number(type));
  expr.push(builders.number(args.length));
  for (let e of args) {
    if (typeof e === "number") {
      expr.push(builders.number(e));
    } else {
      expr.push(...constructBoolean(builders, e));
    }
  }
  return expr;
}
