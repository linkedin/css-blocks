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

/**
 * The goal of style resolution is to use the relationships declared between
 * different CSS Block styles to infer the presence of some styles based
 * on the current runtime set of styles applied explicitly by the author.
 *
 * In addition to adding styles to an element, style resolution can result in
 * the removal of an explicitly applied style when the element's styles do not
 * meet the requirements of those styles based on the presence of related
 * styles.
 *
 * Specifically, style resolution handles the following CSS Block features:
 * - Block Inheritance.
 * - Stylesheet-based style composition.
 * - Block aliases.
 * - Class attributes only matching an element when the element has the class.
 *
 * This class implements a graph where the nodes are styles and directed edges
 * are "implications". That is, the edge of (s1, s2) means that style s1 implies
 * the presence of style s2.
 *
 * The graph's start node is a javascript Symbol named `root`. A style is
 * considered to be applied to the element if it is reachable from the start
 * node.
 *
 * We first populate the graph the graph with all possible styles that might be
 * applied to the element and as we do so we record any requirements for the presence
 * of that applied style because we can't know whether the requirements are properly
 * met until all styles are added to the graph.
 *
 * Some requirements only remove one or more implications, which might leave
 * the style node connected through some other path. Other requirements can
 * cause the style node and all outbound implications to be removed.
 *
 * Because we use a unique number to represent a style, this graph is
 * constructed a little differently from most graphs: There is no node type.
 * Instead, we use a Map where the key is a style id and the value is a set of
 * style ids implied by the key.
 *
 * The RuntimeDataGenerator emits data about the CSS Blocks styles that has
 * undergone a significant amount of data preparation in order for this resolver
 * to run without needing to perform its work in the domain of the CSS Block
 * interfaces. Instead the CSS Block relationships are boiled down to implied
 * styles and style requirements.
 *
 * An implied style takes one of three forms:
 * - A style id (always implied)
 * - A css class name (from an alias)
 * - A conditional style implies one or more styles but only when the condition
 * is satisfied. The condition is a boolean style expression of the same format
 * that is used by the optimizer's output classnames. These conditions become a
 * type of style requirement.
 *
 * A style requirement is a mapping from a style id to a boolean style
 * expression that must evaluate to true in order for the style to be allowed
 * to remain on the element.
 *
 * In order to enforce style requirements, once we've added all possible styles
 * to the graph, we iterate over the requirements and remove any styles or
 * implications that are not satisfied. If any styles are removed, this may
 * cause a style requirement that previously was satisfied to become
 * dissatisfied. Because of this we keep iterating over the list of style
 * requirements until no styles are removed.
 *
 * During style requirements processing it's possible for sections of the graph
 * to become disconnected from the root node, thus causing all the styles that
 * were transitively implied by the removed style to also be removed from the
 * element.
 *
 * Unfortunately, this means that during requirements processing we must
 * perform a depth first search for any style that is mentioned in a boolean
 * style expression. Fortunately, the size of the graph is generally small
 * and relatively flat. However, there are ways to optimize the graph
 * so that these reads are faster and in aggregate might result in a small
 * runtime performance boost.
 */
export class StyleResolver {
  /** source data for implied styles and style requirements. */
  data: AggregateRewriteData;
  /** This is the implication graph. */
  implications: Map<number | typeof root, Set<number>>;
  _impliedClassNames: Map<number, Set<string>>;
  /** Style requirements that must be satisfied. */
  conditionals: Array<Condition>;
  constructor(data: AggregateRewriteData) {
    this.data = data;
    this.implications = new Map<typeof root | number, Set<number>>();
    this._impliedClassNames = new Map<number, Set<string>>();
    this.conditionals = [];
  }

  /**
   * Returns true if the style is currently connected to the root node.
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

  /**
   * Adds an explicitly declared style to the style resolver.
   */
  public addStyle(style: number) {
    this.addImpliedStyle(root, style);
  }

  /**
   * This method mutates the graph and should only be called a single time
   * once all styles are added.
   */
  public resolve(): Set<number> {
    this.importRequirements();
    this.processConditions();
    return this.currentStyles();
  }

  /**
   * Gets all the implied class names for styles currently connected to root.
   */
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

  /**
   * Imports implied styles from the read only aggregate rewrite data into this
   * resolver.
   */
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

  /**
   * Adds style implications and records the associated style requirements.
   */
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

  /**
   * Evaluates a boolean style expression.
   */
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

  /**
   * Helper function that is used to construct a set of all styles reachable
   * from the root.
   */
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
