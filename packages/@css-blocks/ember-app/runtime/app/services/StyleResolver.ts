import { AggregateRewriteData, ConditionalStyle, ConditionalStyleExpression, StyleExpression } from "./AggregateRewriteData";

const root = Symbol("style root");
const STYLE_TYPE = Symbol("style type");
const IMPLICATION_TYPE = Symbol("style type");

interface StyleCondition {
  type: typeof STYLE_TYPE;
  style: number;
  condition: ConditionalStyleExpression;
}

interface ImplicationCondition {
  type: typeof IMPLICATION_TYPE;
  fromStyle: number;
  toStyles: Array<number>;
  condition: ConditionalStyleExpression;
}

enum Operator {
  AND = 1,
  OR = 2,
  NOT = 3,
}

function assertNever(_value: never): never {
  throw new Error("[Internal Error] This should have never happened.");
}

type Condition = StyleCondition | ImplicationCondition;

export class StyleResolver {
  data: AggregateRewriteData;
  implications: Map<number | typeof root, Set<number>>;
  _impliedClassNames: Map<number, Set<string>>;
  conditionals: Array<Condition>;
  constructor(data: AggregateRewriteData) {
    this.data = data;
    this.implications = new Map<typeof root | number, Set<number>>();
    this._impliedClassNames = new Map<number, Set<string>>();
    this.conditionals = [];
  }

  /**
   * Returns true if the style is connected to the root node.
   */
  public hasStyle(styleToFind: number): boolean {
    return this.hasStyleFrom(root, styleToFind);
  }

  private hasStyleFrom(fromStyle: number | typeof root, styleToFind: number): boolean {
    let implication = this.implications.get(fromStyle);
    if (implication) {
      if (implication.has(styleToFind)) return true;
      for (let s of implication) {
        if (this.hasStyleFrom(s, styleToFind)) return true;
      }
    }
    return false;
  }

  public addStyle(style: number) {
    this.addImpliedStyle(root, style);
  }

  public resolve(): Set<number> {
    this.importRequirements();
    this.processConditions();
    return this.currentStyles();
  }

  public impliedClassNames(): Set<string> {
    let classNames = new Set<string>();
    for (let style of this.currentStyles()) {
      let implied = this._impliedClassNames.get(style);
      if (implied) {
        for (let className of implied) {
          classNames.add(className);
        }
      }
    }
    return classNames;
  }

  public currentStyles(): Set<number> {
    let styles = new Set<number>();
    this.currentStylesFrom(root, styles);
    return styles;
  }

  private addImpliedStyle(impliedBy: number | typeof root, style: number) {
    addValueToMap(this.implications, impliedBy, style);
    this._importImpliedStyles(style);
  }

  private _importImpliedStyles(fromStyle: number) {
    let implied = this.data.impliedStyles[fromStyle];
    if (implied) {
      for (let i of implied) {
        if (typeof i === "string") {
          this.addImpliedClassName(fromStyle, i);
        } else if (typeof i === "number") {
          this.addImpliedStyle(fromStyle, i);
        } else {
          this.addCondition(fromStyle, i);
        }
      }
    }
  }

  private addCondition(fromStyle: number, condition: ConditionalStyle) {
    this.conditionals.push({
      type: IMPLICATION_TYPE,
      fromStyle,
      toStyles: condition.styles,
      condition: condition.conditions,
    });
    for (let s of condition.styles) {
      this.addImpliedStyle(fromStyle, s);
    }
  }

  private addImpliedClassName(impliedBy: number, className: string) {
    addValueToMap(this._impliedClassNames, impliedBy, className);
  }

  private processConditions() {
    // This removes all the styles for which the condition isn't satisfied.
    // Doing so might cause some other condition to no longer be satisfied,
    // So we keep processing the conditionals until nothing was removed.
    let checkAgain = true;
    while (checkAgain) {
      checkAgain = false;
      for (let conditional of this.conditionals) {
        if (!this.evaluateExpression(conditional.condition)) {
          if (conditional.type === STYLE_TYPE) {
            let result = this.removeStyle(conditional.style);
            checkAgain = checkAgain || result;
          } else if (conditional.type === IMPLICATION_TYPE) {
            for (let s of conditional.toStyles) {
              let result = this.removeImplication(conditional.fromStyle, s);
              checkAgain = checkAgain || result;
            }
          } else {
            assertNever(conditional);
          }
        }
      }
    }
  }

  private evaluateExpression(expr: StyleExpression): boolean {
    if (typeof expr === "number") return this.hasStyle(expr);
    let op: Operator = expr[0];
    if (op === Operator.AND) {
      for (let i = 1; i < expr.length; i++) {
        if (!this.evaluateExpression(expr[i])) return false;
      }
      return true;
    } else if (op === Operator.OR) {
      for (let i = 1; i < expr.length; i++) {
        if (this.evaluateExpression(expr[i])) return true;
      }
      return false;
    } else if (op === Operator.NOT) {
      return !this.evaluateExpression(expr[1]);
    } else {
      assertNever(op);
    }
  }

  /**
   * Removes an edge from the graph. This may leave orphaned nodes in the graph.
   */
  private removeImplication(fromStyle: number, toStyle: number): boolean {
    if (this.implications.has(fromStyle)) {
      return this.implications.get(fromStyle)!.delete(toStyle);
    }
    return false;
  }

  /**
   * Remove a style from the graph. This returns true if a style
   * is removed, however that style might not be connected to the root node.
   */
  private removeStyle(style: number): boolean {
    let wasRemoved = false;
    this.implications.delete(style);
    for (let implication of this.implications.values()) {
      let removed = implication.delete(style);
      wasRemoved = wasRemoved || removed;
    }
    return wasRemoved;
  }

  private currentStylesFrom(fromStyle: number | typeof root, styles: Set<number>): void {
    if (fromStyle !== root) {
      styles.add(fromStyle);
    }
    let implications = this.implications.get(fromStyle);
    if (!implications) return;
    for (let s of implications) {
      this.currentStylesFrom(s, styles);
    }
  }

  private importRequirements() {
    for (let style of this.currentStyles()) {
      let condition = this.data.styleRequirements[style];
      if (condition) {
        this.addRequirement(style, condition);
      }
    }
  }

  private addRequirement(style: number, condition: ConditionalStyleExpression) {
    this.conditionals.push({
      type: STYLE_TYPE,
      style,
      condition,
    });
  }
}

function addValueToMap<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key)!.add(value);
}
