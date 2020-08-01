/// @ts-ignore
import Helper from "@ember/component/helper";
/// @ts-ignore
import Service from "@ember/service";
import type { ObjectDictionary } from "@opticss/util";

/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
import type { AggregateRewriteData, ConditionalStyle, ImpliedStyles, StyleExpression } from "./AggregateRewriteData";

const data: AggregateRewriteData = _data;

type ClassNameExpression = Array<string | number | boolean | null>;

function nextVal(args: ClassNameExpression, type: "number", allowNull: boolean, allowUndefined: false): number | null;
function nextVal(args: ClassNameExpression, type: "number", allowNull: boolean, allowUndefined: boolean): number | null | undefined;
function nextVal(args: ClassNameExpression, type: "string", allowNull: boolean, allowUndefined: boolean): string | null | undefined;
function nextVal(args: ClassNameExpression, type: "string" | "number", allowNull: boolean, allowUndefined: boolean): string | number | boolean | null | undefined {
  if (args.length === 0) {
    throw new Error("empty argument stack");
  }
  let v = args.pop();
  if (v === undefined) {
    if (allowUndefined) {
      return undefined;
    } else {
      throw new Error(`Unexpected undefined value encountered.`);
    }
  }
  if (v === null) {
    if (allowNull) {
      return v;
    } else {
      throw new Error(`Unexpected null value encountered.`);
    }
  }
  if (typeof v === type) {
    return v;
  }
  throw new Error(`Expected ${type} got ${v}`);
}

function num(args: ClassNameExpression): number;
function num(args: ClassNameExpression, allowNull: false): number;
function num(args: ClassNameExpression, allowNull: true): number | null;
function num(args: ClassNameExpression, allowNull = false): number | null {
  return nextVal(args, "number", allowNull, false);
}

function str(args: ClassNameExpression): string;
function str(args: ClassNameExpression, allowNull: false): string;
function str(args: ClassNameExpression, allowNull: false, allowUndefined: false): string;
function str(args: ClassNameExpression, allowNull: true): string | null;
function str(args: ClassNameExpression, allowNull: true, allowUndefined: false): string | null;
function str(args: ClassNameExpression, allowNull: false, allowUndefined: true): string | undefined;
function str(args: ClassNameExpression, allowNull: true, allowUndefined: true): string | null | undefined;
function str(args: ClassNameExpression, allowNull = false, allowUndefined = false): string | null | undefined {
  return nextVal(args, "string", allowNull, allowUndefined);
}

/**
 * interprets the next value as a truthy and coerces it to a boolean.
 */
function bool(args: ClassNameExpression): boolean {
  return !!args.pop();
}

/**
 * Throws an error if the value is null or undefined.
 * @param val a value that should not be null or undefined.
 * @param msg The error message
 */
function assert(val: unknown, msg: string) {
  // I'm using double equals here on purpose for the type coercion.
  // tslint:disable-next-line:triple-equals
  if (val == undefined) throw new Error(msg);
}

enum Operator {
  AND = 1,
  OR = 2,
  NOT = 3,
}

enum Condition {
  static = 1,
  toggle = 2,
  ternary = 3,
  switch = 4,
}

const enum FalsySwitchBehavior {
  error = 0,
  unset = 1,
  default = 2,
}

// tslint:disable-next-line:no-default-export
export default class CSSBlocksService extends Service {
  classNamesFor(argv: Array<string | number | boolean | null>): string {
    let args = argv.slice();
    args.reverse(); // pop() is faster than shift()
    let rewriteVersion = num(args);
    if (rewriteVersion > 0) throw new Error(`The rewrite schema is newer than expected. Please upgrade @css-blocks/ember-app.`);

    let numBlocks = num(args);
    // the values in blockStyleIndices map style strings to an index into the array
    // stored at the same index of blockStyleIds. That means that
    // `blockStyleIds[i][blockStyleIndices[i][":scope"]]` returns the globally
    // unique id for the ":scope" style of the runtime selected block.
    let blockStyleIndices = new Array<ObjectDictionary<number>>();
    // When null, it indicates a missing style. This can happen when the block
    // that implements an interface did not fully implement that interface
    // because the block it implements has changed since the implementing block
    // was precompiled and released.
    let blockStyleIds = new Array<Array<number | null>>();
    while (numBlocks--) {
      let sourceGuid = str(args);
      let runtimeGuid = str(args, true); // this won't be non-null until we implement block passing.
      let blockIndex = data.blockIds[sourceGuid];
      assert(blockIndex, `unknown block ${sourceGuid}`);
      let runtimeBlockIndex = runtimeGuid === null ? blockIndex : data.blockIds[runtimeGuid];
      let blockInfo = data.blocks[blockIndex];
      blockStyleIndices.push(blockInfo.blockInterfaceStyles);
      let styleIds = blockInfo.implementations[runtimeBlockIndex];
      assert(styleIds, "unknown implementation");
      blockStyleIds.push(styleIds);
    }

    // Now we build a list of styles ids. these styles are referred to in the
    // class name expression by using an index into the `styles` array that
    // we're building.
    let numStyles = num(args);
    let styles = new Array<number | null>();
    while (numStyles--) {
      let block = num(args);
      let style = str(args);
      styles.push(blockStyleIds[block][blockStyleIndices[block][style]]);
    }

    // Now we calculate the runtime javascript state of these styles.
    // we start with all of the styles as "off" and can turn them on
    // by setting the corresponding index of a `style` entry in `styleStates`
    // to true.
    let numConditions = num(args);
    let styleStates = new Array<boolean>(styles.length);
    while (numConditions--) {
      let condition = num(args);
      switch (condition) {
        case Condition.static:
          // static styles are always enabled.
          styleStates[num(args)] = true;
          break;
        case Condition.toggle:
          // Can enable a single style
          let b = bool(args);
          let numStyles = num(args);
          while (numStyles--) {
            let s = num(args);
            if (b) {
              styleStates[s] = true;
            }
          }
          break;
        case Condition.ternary:
          // Ternary supports multiple styles being enabled when true
          // and multiple values being enabled when false.
          let result = bool(args);
          let numIfTrue = num(args);
          while (numIfTrue--) {
            let s = num(args);
            if (result) styleStates[s] = true;
          }
          let numIfFalse = num(args);
          while (numIfFalse--) {
            let s = num(args);
            if (!result) styleStates[s] = true;
          }
          break;
        case Condition.switch:
          let falsyBehavior = num(args);
          let currentValue = str(args, true, true);
          let numValues = num(args);
          let found = false;
          let legal: Array<String> = [];
          while (numValues--) {
            let v = str(args);
            legal.push(v);
            let match = (v === currentValue);
            found = found || match;
            let numStyles = num(args);
            while (numStyles--) {
              let s = num(args);
              if (match) styleStates[s] = true;
            }
          }
          if (!found) {
            if (!currentValue) {
              if (falsyBehavior === FalsySwitchBehavior.error) {
                throw new Error(`A value is required.`);
              }
            } else {
              throw new Error(`"${currentValue} is not a known attribute value. Expected one of: ${legal.join(", ")}`);
            }
          }
          break;
        default:
          throw new Error(`Unknown condition type ${condition}`);
      }
    }
    let stylesApplied = new Set<number>();
    for (let i = 0; i < styles.length; i++) {
      if (styleStates[i] && styles[i] !== null) {
        stylesApplied.add(styles[i]!);
      }
    }

    let aliasClassNames = applyImpliedStyles(stylesApplied, data.impliedStyles);

    let classNameIndices = new Set<number>();
    // TODO: Only iterate over the subset of optimizations that might match this
    // element's styles.
    for (let [clsIdx, expr] of data.optimizations) {
      if (evaluateExpression(expr, stylesApplied)) {
        classNameIndices.add(clsIdx);
      }
    }
    let classNames = new Array<string>(...aliasClassNames);
    for (let idx of classNameIndices) {
      classNames.push(data.outputClassnames[idx]);
    }
    let result = classNames.join(" ");
    return result;
  }
}

function evaluateExpression(expr: StyleExpression, stylesApplied: Set<number>, stylesApplied2?: Set<number>): boolean {
  if (typeof expr === "number") return (stylesApplied.has(expr) || (!!stylesApplied2 && stylesApplied2.has(expr)));
  if (expr[0] === Operator.AND) {
    for (let i = 1; i < expr.length; i++) {
      if (!evaluateExpression(expr[i], stylesApplied, stylesApplied2)) return false;
    }
    return true;
  } else if (expr[0] === Operator.OR) {
    for (let i = 1; i < expr.length; i++) {
      if (evaluateExpression(expr[i], stylesApplied, stylesApplied2)) return true;
    }
    return false;
  } else if (expr[0] === Operator.NOT) {
    return !evaluateExpression(expr[1], stylesApplied, stylesApplied2);
  } else {
    return false;
  }
}

function applyImpliedStyles(stylesApplied: Set<number>, impliedStyles: ImpliedStyles): Set<string> {
  console.log({impliedStyles});
  let aliases = new Set<string>();
  let newStyles = new Set(stylesApplied);
  let failedConditions = new Set<ConditionalStyle>();
  // for each new style we get the directly implied styles by each of them and
  // add them to the next iteration of new styles. if a conditionally applied
  // style doesn't match, it might be due to an implied style that isn't applied
  // yet, so we keep the failures around and try adding them during each
  // iteration once new styles are taken into account.
  while (newStyles.size > 0) {
    let nextStyles = new Set<number>();
    let newFailedConditions = new Set<ConditionalStyle>();
    for (let style of newStyles) {
      let implied = impliedStyles[style];
      if (!implied) continue;
      for (let i of implied) {
        if (typeof i === "number") {
          nextStyles.add(i);
        } else if (typeof i === "string") {
          aliases.add(i);
        } else {
          if (evaluateExpression(i.conditions, stylesApplied, newStyles)) {
            for (let s of i.styles) nextStyles.add(s);
          } else {
            newFailedConditions.add(i);
          }
        }
      }
    }
    for (let s of newStyles) {
      stylesApplied.add(s);
    }
    newStyles = nextStyles;
    for (let c of failedConditions) {
      if (evaluateExpression(c.conditions, stylesApplied, newStyles)) {
        for (let s of c.styles) newStyles.add(s);
        failedConditions.delete(c);
      }
    }
    for (let c of newFailedConditions) {
      failedConditions.add(c);
    }
  }
  return aliases;
}
