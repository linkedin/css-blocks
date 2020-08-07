/// @ts-ignore
import Helper from "@ember/component/helper";
/// @ts-ignore
import Service from "@ember/service";

/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
import type { AggregateRewriteData, ConditionalStyle, GlobalBlockIndex, ImpliedStyles, OptimizationEntry, StyleExpression, StyleRequirements } from "./AggregateRewriteData";
import { StyleEvaluator } from "./StyleEvaluator";
import { StyleResolver } from "./StyleResolver";

const data: AggregateRewriteData = _data;

let DEBUGGING = false;

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
  constructor() {
    super(...arguments);
    this.possibleOptimizations = getOptimizationInverseMap(data.optimizations);
    this.styleNames = getStyleNames();
  }
  classNamesFor(argv: Array<string | number | boolean | null>): string {
    if (DEBUGGING) {
      console.log(argv);
    }
    let styleEvaluator = new StyleEvaluator(data, argv);
    let stylesApplied = styleEvaluator.evaluate();
    this.debugStyles("directly applied", stylesApplied);

    let resolver = new StyleResolver(data);
    for (let style of stylesApplied) {
      resolver.addStyle(style);
    }

    if (DEBUGGING) {
      this.debugStyles("all possible implied styles", resolver.currentStyles());
    }

    stylesApplied = resolver.resolve();

    this.debugStyles("after requirements", stylesApplied);

    let classNameIndices = new Set<number>();
    // TODO: Only iterate over the subset of optimizations that might match this
    // element's styles.
    for (let [clsIdx, expr] of this.getPossibleOptimizations(stylesApplied)) {
      if (this.evaluateExpression(expr, stylesApplied)) {
        classNameIndices.add(clsIdx);
      }
    }
    let classNames = new Array<string>(...resolver.impliedClassNames());
    for (let idx of classNameIndices) {
      classNames.push(data.outputClassnames[idx]);
    }
    let result = classNames.join(" ");
    if (DEBUGGING) {
      console.log(classNames);
    }
    return result;
  }

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
    if (!DEBUGGING) return;
    let appliedStyleNames = new Array<string>();
    for (let s of stylesApplied) {
      appliedStyleNames.push(this.styleNames[s]);
    }
    console.log(msg, appliedStyleNames);
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

  ensureRequirementsAreSatisfied(stylesApplied: Set<number>, requirements: StyleRequirements): void {
    let checkAgain = true;
    while (checkAgain) {
      checkAgain = false;
      for (let s of stylesApplied) {
        let expr = requirements[s];
        if (expr && !this.evaluateExpression(expr, stylesApplied)) {
          if (DEBUGGING) {
            console.log(`Removing ${this.styleNames[s]} because`, this.debugExpression(expr));
          }
          stylesApplied.delete(s);
          checkAgain = true;
          break;
        }
      }
    }
  }

  evaluateExpression(expr: StyleExpression, stylesApplied: Set<number>, stylesApplied2?: Set<number>): boolean {
    if (typeof expr === "number") return (stylesApplied.has(expr) || (!!stylesApplied2 && stylesApplied2.has(expr)));
    if (expr[0] === Operator.AND) {
      for (let i = 1; i < expr.length; i++) {
        if (!this.evaluateExpression(expr[i], stylesApplied, stylesApplied2)) return false;
      }
      return true;
    } else if (expr[0] === Operator.OR) {
      for (let i = 1; i < expr.length; i++) {
        if (this.evaluateExpression(expr[i], stylesApplied, stylesApplied2)) return true;
      }
      return false;
    } else if (expr[0] === Operator.NOT) {
      return !this.evaluateExpression(expr[1], stylesApplied, stylesApplied2);
    } else {
      return false;
    }
  }

  applyImpliedStyles(stylesApplied: Set<number>, impliedStyles: ImpliedStyles): Set<string> {
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
            if (this.evaluateExpression(i.conditions, stylesApplied, newStyles)) {
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
        if (this.evaluateExpression(c.conditions, stylesApplied, newStyles)) {
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
