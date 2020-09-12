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
  static enableDebugMode: boolean = false;
  static enableTestMode: boolean = false;
  constructor() {
    super(...arguments);
    this.possibleOptimizations = getOptimizationInverseMap(data.optimizations);
    this.styleNames = getStyleNames();
  }
  classNamesFor(argv: Array<string | number | boolean | null>): string {
    if (CSSBlocksService.enableDebugMode) {
      console.log(argv);
    }
    let stylesApplied = this.getDirectlyAppliedStyles(argv);

    return this.getImpliedAndOptimizedStyles(stylesApplied);
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
   * For a set of applied styleIds, returns a final set of classNames to be
   * applied. This uses the styleResolver to get all the implied styles
   * @param stylesApplied set of styleIds that are directly applied on the element
   */
  getImpliedAndOptimizedStyles(stylesApplied: Set<number>): string {
    let resolver = new StyleResolver(data);
    for (let style of stylesApplied) {
      resolver.addStyle(style);
    }

    if (CSSBlocksService.enableDebugMode) {
      this.debugStyles("all possible implied styles", resolver.currentStyles());
    }

    stylesApplied = resolver.resolve();

    this.debugStyles("after requirements", stylesApplied);

    let classNameIndices = new Set<number>();
    // TODO: Only iterate over the subset of optimizations that might match this
    // element's styles.
    for (let [clsIdx, expr] of this.getPossibleOptimizations(stylesApplied)) {
      if (evaluateExpression(expr, stylesApplied)) {
        classNameIndices.add(clsIdx);
      }
    }
    let classNames = new Array<string>(...resolver.impliedClassNames());
    for (let idx of classNameIndices) {
      classNames.push(data.outputClassnames[idx]);
    }
    let result = classNames.join(" ");
    if (CSSBlocksService.enableDebugMode) {
      console.log(classNames);
    }
    return result;
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
    if (!CSSBlocksService.enableDebugMode) return;
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

export function evaluateExpression(expr: StyleExpression, stylesApplied: Set<number>, stylesApplied2?: Set<number>): boolean {
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

function getStyleNames(): Record<number, string> {
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
