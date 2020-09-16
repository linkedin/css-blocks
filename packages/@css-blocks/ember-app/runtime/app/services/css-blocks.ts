/// @ts-ignore
import Helper from "@ember/component/helper";
/// @ts-ignore
import Service from "@ember/service";

/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
import type { AggregateRewriteData, GlobalBlockIndex, OptimizationEntry, StyleExpression } from "./AggregateRewriteData";
import { StyleEvaluator } from "./StyleEvaluator";
import { StyleResolver } from "./StyleResolver";

const data: AggregateRewriteData = _data;

type DebugExpression = string | Array<DebugExpression>;

enum Operator {
  AND = 1,
  OR = 2,
  NOT = 3,
}

interface StyleIdToOptimizationsMap {
  [styleId: number]: Array<number>;
}

// tslint:disable-next-line:no-default-export
export default class CSSBlocksService extends Service {
  possibleOptimizations!: StyleIdToOptimizationsMap;
  styleNames: { [name: string]: string };
  enableDebugMode = false;
  static enableTestMode = false;
  constructor() {
    super(...arguments);
    this.possibleOptimizations = getOptimizationInverseMap(data.optimizations);
    this.styleNames = getStyleNames();
  }

  /**
   * Returns the set of classNames to be applied to a given element, based on
   * the runtime conditions that are present on the element. This method is
   * invoked as helper to render classNames in the template files rewritten by
   * css blocks
   */
  classNamesFor(argv: Array<string | number | boolean | null>): string {
    if (this.enableDebugMode) {
      console.log(argv);
    }
    // get all the directly applied styles
    let stylesApplied = this.getDirectlyAppliedStyles(argv);
    // get all the implied styles
    let resolverOutput = this.getImpliedStyles(stylesApplied);
    // update the set of stylesApplied after the resolver has run
    stylesApplied = resolverOutput.stylesApplied;
    // get all the optimized styles
    let classNames = resolverOutput.classNames.concat(this.getOptimizedStyles(stylesApplied));
    // now join them all together
    let result = classNames.join(" ");
    if (this.enableDebugMode) {
      console.log(classNames);
    }
    return result;
  }

  /**
   * Uses the style evaluator to return the set of directly applied styleIds
   * based on the arguemnts passed to the elements
   */
  getDirectlyAppliedStyles(argv: Array<string | number | boolean | null>): Set<number> {
    let styleEvaluator = new StyleEvaluator(data, argv);
    let stylesApplied = styleEvaluator.evaluate();
    this.debugStyles("directly applied", stylesApplied);
    return stylesApplied;
  }

  /**
   * For a set of applied styleIds, users the styleResolver to get all the implied styles
   * @param stylesApplied set of styleIds that are directly applied on the element
   */
  getImpliedStyles(stylesApplied: Set<number>): {stylesApplied: Set<number>; classNames: string[]} {
    let resolver = new StyleResolver(data);
    for (let style of stylesApplied) {
      resolver.addStyle(style);
    }
    if (this.enableDebugMode) {
      this.debugStyles("all possible implied styles", resolver.currentStyles());
    }
    stylesApplied = resolver.resolve();
    this.debugStyles("after requirements", stylesApplied);
    return {
      stylesApplied,
      classNames: new Array<string>(...resolver.impliedClassNames()),
    };
  }

  /**
   * Returns the set of styles by applying any and all optimizations
   * @param stylesApplied  set of styleIds that are directly applied and are
   * implied by the resolver
   */
  getOptimizedStyles(stylesApplied: Set<number>): string[] {
    let classNameIndices = new Set<number>();
    let classNames = new Array<string>();
    for (let [clsIdx, expr] of this.getPossibleOptimizations(stylesApplied)) {
      if (evaluateExpression(expr, stylesApplied)) {
        classNameIndices.add(clsIdx);
      }
    }
    for (let idx of classNameIndices) {
      classNames.push(data.outputClassnames[idx]);
    }
    return classNames;
  }

  /**
   * Returns the list of optimization outputs that mention
   * any style applied to the element.
   */
  getPossibleOptimizations(stylesApplied: Set<number>): Array<OptimizationEntry> {
    let optimizations: Array<number> = [];
    for (let style of stylesApplied) {
      let possibleOpts = this.possibleOptimizations[style];
      if (possibleOpts) {
        optimizations.push(...possibleOpts);
      }
    }
    return [...new Set(optimizations)].map(i => data.optimizations[i]);
  }

  debugStyles(msg: string, stylesApplied: Set<number>): void {
    if (!this.enableDebugMode) return;
    console.log(msg, this.getStyleNames(stylesApplied));
  }

  /**
   * Reverse maps style ids to their style names for debugging.
   * We also use this in test mode to generate human readable styleNames
   */
  getStyleNames(stylesApplied: Set<number>): string[] {
    let appliedStyleNames = new Array<string>();
    for (let s of stylesApplied) {
      appliedStyleNames.push(this.styleNames[s]);
    }
    return appliedStyleNames;
  }

  debugExpression(expr: StyleExpression): DebugExpression {
    if (typeof expr === "number") return (this.styleNames[expr]);
    let debugExpr: DebugExpression = [];
    if (expr[0] === Operator.AND) {
      debugExpr.push("AND");
    } else if (expr[0] === Operator.OR) {
      debugExpr.push("OR");
    } else if (expr[0] === Operator.NOT) {
      debugExpr.push("NOT");
    }
    for (let i = 1; i < expr.length; i++) {
      debugExpr.push(this.debugExpression(expr[i]));
    }
    return debugExpr;
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

function getOptimizationInverseMap(optimizations: Array<OptimizationEntry>): StyleIdToOptimizationsMap {
  let inverseMap: StyleIdToOptimizationsMap = {};
  for (let i = 0; i < optimizations.length; i++) {
    for (let styleId of new Set(extractStyleIds(optimizations[i][1]))) {
      if (inverseMap[styleId] === undefined) {
        inverseMap[styleId] = [];
      }
      inverseMap[styleId].push(i);
    }
  }
  return inverseMap;
}

function extractStyleIds(expr: StyleExpression): Array<GlobalBlockIndex> {
  if (typeof expr === "number") {
    return [expr];
  } else {
    let result = new Array<GlobalBlockIndex>();
    for (let i = 1; i < expr.length; i++) {
      result.push(...extractStyleIds(expr[i]));
    }
    return result;
  }
}

export function getStyleNames(): Record<number, string> {
  let styleNames: Record<number, string> = {};
  for (let blockGuid of Object.keys(data.blockIds)) {
    let blockIndex = data.blockIds[blockGuid];
    let blockInfo = data.blocks[blockIndex];
    for (let name of Object.keys(blockInfo.blockInterfaceStyles)) {
      let styleIndex = blockInfo.blockInterfaceStyles[name];
      let styleId = blockInfo.implementations[blockIndex][styleIndex]!;
      styleNames[styleId] = `${blockGuid}${name}`;
    }
  }
  return styleNames;
}
