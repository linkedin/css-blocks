import type { ObjectDictionary } from "@opticss/util";

import { AggregateRewriteData } from "./AggregateRewriteData";

export type ClassNameExpression = Array<string | number | boolean | null>;
type Defined<T> = T extends undefined ? never : T;

/**
 * Throws an error if the value is null or undefined.
 * @param val a value that should not be null or undefined.
 * @param msg The error message
 */
function assert<T>(val: T, msg: string): asserts val is Defined<T> {
  // I'm using double equals here on purpose for the type coercion.
  // tslint:disable-next-line:triple-equals
  if (val == undefined) throw new Error(msg);
}

const enum Condition {
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

/**
 * Evaluates the runtime state of the style expression provided by the CSS
 * Blocks rewriter.
 *
 * The result of evaluating a style expression is a set of global style ids
 * that are currently enabled on this element by the author.
 *
 * Note: The full set of style ids that are enabled on the element is not known
 * until after style resolution.
 *
 * The style expression is a list of values that consists of four sections:
 * 1. Metadata
 * 2. Block References
 * 3. Style References
 * 4. Conditionals
 *
 * ## Metadata
 *
 * The metadata consists of a single value, an integer that represents a schema
 * version that describes the format of the style expression. If the rewrite
 * changes, we'll use this to simultaneously support the old and new version(s).
 *
 * ## Block References
 *
 * The purpose of the block references is to enumerate the list of blocks that
 * the styles come from. These blocks are later referred to in the style
 * expression according to a number that represents a zero-based index into the
 * order they appear in the block reference portion of the style expression.
 *
 * Format: `[blockCount: number, (sourceBlockGuid: string, runtimeBlockGuid: string | null)+]`
 *
 * - `blockCount` is the number of `sourceBlockGuid`/`runtimeBlockGuid` pairs that follow.
 * - `sourceBlockGuid` is the guid of the block that was referenced in the source code.
 * - `runtimeBlockGuid` is the guid of a block that implements the
 *   `sourceBlockGuid` interface and is meant to replace the source block at
 *   runtime. The `runtimeBlockGuid` is null when no runtime block is passed.
 *   This means the source block is used.
 *
 * ## Style References
 *
 * The purpose of Style References is to enumerate the list of styles that
 * are referenced from the style conditionals that follow. Later references
 * to these styles use the zero-based index into the order they appear in this
 * section.
 *
 * Format: `[styleCount: number, (blockIndex: number, styleName: string)+]
 * styleCount: The number of styles
 *
 * - `styleCount` is the number of styles that follow. Each style is a pair
 *   of values.
 * - `blockIndex` is the index that references the block of the style.
 * - `styleName` is a string that uniquely identifies the style in the block
 *   given as well as in any block that implements the same interface.
 *
 * ## Style Conditionals
 *
 * Style conditionals are how the possible authored styles are selected based
 * on the runtime state of the application. There are 4 types of conditionals.
 *
 * The general form of the conditionals section of the style expression is
 *
 * Format: `[conditionalCount <conditional>+]`
 *
 * Where each `<conditional>` has a first argument that indicates the type
 * of the conditional and the remaining arguments for each conditional are
 * specific to that conditional type.
 *
 * The behavior of the conditional is to enable one or more of the possible
 * styles on the element. All styles start out as disabled and require a conditional
 * in order to cause that style to become enabled. A conditional never disables
 * a style. Although rare, several conditionals might enable the same style.
 *
 * ### Static Conditional
 *
 * The static conditional enables a single style. No javascript-based state is
 * taken into account.
 *
 * Type Value: `Condition.static` or `1`
 * Format: [type: number, styleIndex: number]
 *
 * - `styleIndex`: An index of one of the styles provided in the style
 *   reference portion of the style expression.
 *
 * ### Toggle Conditional
 *
 * A toggle conditional is used to enable one or more styles based on the
 * "truthiness" of a javascript value.
 *
 * Format: `[type: number, value: boolean, styleCount: number, (styleIndex: number)+]`
 *
 * - `type`: `Condition.toggle` or `2`
 * - `value`: A javascript value will be coerced to a boolean.
 * - `styleCount`: The number of styles that are enabled when this condition is true.
 * - `styleIndex`: An index of one of the styles provided in the style
 *   reference portion of the style expression.
 *
 * ### Ternary Conditional
 *
 * A ternary conditional is used to enable 0 or more styles when a variable is
 * true or to enable a different set of 0 or more styles when the same variable
 * is false.
 *
 * Format: `[type: number, value: boolean,
 *           trueCount: number, (trueStyleIndex: number)*,
 *           falseCount: number, (falseStyleIndex: number)*]`
 *
 * - `type`: `Condition.ternary` or `3`
 * - `value`: A javascript value will be coerced to a boolean.
 * - `trueCount`: The number of styles that are enabled when this condition is true.
 * - `trueStyleIndex`: An index of one of the styles provided in the style
 *   reference portion of the style expression.
 * - `falseCount`: The number of styles that are enabled when this condition is false.
 * - `falseStyleIndex`: An index of one of the styles provided in the style
 *   reference portion of the style expression.
 *
 * ### Switch Conditional
 *
 * A switch conditional is used to enable one or more styles based on the value
 * of a string matching one of several possible values. This conditional is
 * different from the others in that it doesn't select styles from style
 * reference section and it is the only conditional that can result in a
 * runtime error.
 *
 * Format: `[type: number, blockIndex: number,
 *           attributeName: string, value: string | null]`
 *
 * - `type`: `Condition.switch` or `4`
 * - `blockIndex`: An index that references a block from the block reference
 *   portion of the style expression.
 * - `attributeName`: A string that uniquely identifies the attribute in the
 *   block given as well as in any block that implements the same interface.
 * - `value`: A string that must match one of the attribute's values. If null
 *   is returned then no style is enabled (undefined is an error). If the value
 *   does not match one of the known attribute values then an error is raised.
 */
export class StyleEvaluator {
  data: AggregateRewriteData;
  args: ClassNameExpression;
  index = 0;
  // the values in blockStyleIndices map style strings to an index into the array
  // stored at the same index of blockStyleIds. That means that
  // `blockStyleIds[i][blockStyleIndices[i][":scope"]]` returns the globally
  // unique id for the ":scope" style of the runtime selected block.
  blockStyleIndices: Array<Record<string, number>> = [];
  // When null, it indicates a missing style. This can happen when the block
  // that implements an interface did not fully implement that interface
  // because the block it implements has changed since the implementing block
  // was precompiled and released.
  blockStyleIds: Array<Array<number | null>> = [];
  blockGroups: Array<ObjectDictionary<ObjectDictionary<string>>> = [];
  styles: Array<number | null> = [];
  constructor(data: AggregateRewriteData, args: ClassNameExpression) {
    this.data = data;
    this.args = args;
  }

  evaluateBlocks() {
    let numBlocks = this.num();
    while (numBlocks--) {
      let sourceGuid = this.str();
      let runtimeGuid = this.str(true); // this won't be non-null until we implement block passing.
      let blockIndex = this.data.blockIds[sourceGuid];
      assert(blockIndex, `unknown block ${sourceGuid}`);
      let runtimeBlockIndex = runtimeGuid === null ? blockIndex : this.data.blockIds[runtimeGuid];
      let blockInfo = this.data.blocks[blockIndex];
      this.blockStyleIndices.push(blockInfo.blockInterfaceStyles);
      let styleIds = blockInfo.implementations[runtimeBlockIndex];
      assert(styleIds, "unknown implementation");
      this.blockStyleIds.push(styleIds);
      this.blockGroups.push(blockInfo.groups);
    }
  }

  evaluateStyles() {
    // Now we build a list of styles ids. these styles are referred to in the
    // class name expression by using an index into the `styles` array that
    // we're building.
    let numStyles = this.num();
    while (numStyles--) {
      let block = this.num();
      let style = this.str();
      this.styles.push(this.blockStyleIds[block][this.blockStyleIndices[block][style]]);
    }
  }
  evaluateToggleCondition(styleStates: Array<boolean>) {
    // Can enable a single style
    let b = this.bool();
    let numStyles = this.num();
    while (numStyles--) {
      let s = this.num();
      if (b) {
        styleStates[s] = true;
      }
    }
  }

  evaluate(): Set<number> {
    let rewriteVersion = this.num();
    if (rewriteVersion > 0) throw new Error(`The rewrite schema is newer than expected. Please upgrade @css-blocks/ember-app.`);

    this.evaluateBlocks();
    this.evaluateStyles();

    // Now we calculate the runtime javascript state of these styles.
    // we start with all of the styles as "off" and can turn them on
    // by setting the corresponding index of a `style` entry in `styleStates`
    // to true.
    let numConditions = this.num();
    let styleStates = new Array<boolean>(this.styles.length);
    let stylesApplied = new Set<number>();
    while (numConditions--) {
      let condition = this.num();
      switch (condition) {
        case Condition.static:
          // static styles are always enabled.
          styleStates[this.num()] = true;
          break;
        case Condition.toggle:
          this.evaluateToggleCondition(styleStates);
          break;
        case Condition.ternary:
          this.evaluateTernaryCondition(styleStates);
          break;
        case Condition.switch:
          this.evaluateSwitchCondition(stylesApplied);
          break;
        default:
          throw new Error(`Unknown condition type ${condition}`);
      }
    }

    for (let i = 0; i < this.styles.length; i++) {
      if (styleStates[i] && this.styles[i] !== null) {
        stylesApplied.add(this.styles[i]!);
      }
    }

    return stylesApplied;
  }

  evaluateSwitchCondition(stylesApplied: Set<number>) {
    let falsyBehavior = this.num();
    let blockIndex = this.num();
    let attribute = this.str();
    let currentValue = this.str(true, true);
    if (!currentValue) {
      if (currentValue === null || falsyBehavior === FalsySwitchBehavior.unset) {
        return;
      } else {
        throw new Error(`A value is required for ${attribute}.`);
      }
    }
    let attrValue = this.blockGroups[blockIndex][attribute][currentValue];
    if (attrValue === undefined) {
      let legal = Object.keys(this.blockGroups[blockIndex][attribute]);
      throw new Error(`"${currentValue} is not a known attribute value. Expected one of: ${legal.join(", ")}`);
    }
    let style = this.blockStyleIds[blockIndex][this.blockStyleIndices[blockIndex][attrValue]];
    if (style) {
      stylesApplied.add(style);
    }
  }

  evaluateTernaryCondition(styleStates: Array<boolean>) {
    // Ternary supports multiple styles being enabled when true
    // and multiple values being enabled when false.
    let result = this.bool();
    let numIfTrue = this.num();
    while (numIfTrue--) {
      let s = this.num();
      if (result) styleStates[s] = true;
    }
    let numIfFalse = this.num();
    while (numIfFalse--) {
      let s = this.num();
      if (!result) styleStates[s] = true;
    }
  }

  nextVal(type: "number", allowNull: boolean, allowUndefined: false): number | null;
  nextVal(type: "number", allowNull: boolean, allowUndefined: boolean): number | null | undefined;
  nextVal(type: "string", allowNull: boolean, allowUndefined: boolean): string | null | undefined;
  nextVal(type: "string" | "number", allowNull: boolean, allowUndefined: boolean): string | number | boolean | null | undefined {
    if (this.args.length === 0) {
      throw new Error("empty argument stack");
    }
    let v = this.args[this.index++];
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

  num(): number;
  num(allowNull: false): number;
  num(allowNull: true): number | null;
  num(allowNull = false): number | null {
    return this.nextVal("number", allowNull, false);
  }

  str(): string;
  str(allowNull: false): string;
  str(allowNull: true): string | null;
  str(allowNull: false, allowUndefined: false): string;
  str(allowNull: false, allowUndefined: true): string | undefined;
  str(allowNull: true, allowUndefined: false): string | null;
  str(allowNull: true, allowUndefined: true): string | null | undefined;
  str(allowNull = false, allowUndefined = false): string | null | undefined {
    return this.nextVal("string", allowNull, allowUndefined);
  }

  /**
   * interprets the next value as a truthy and coerces it to a boolean.
   */
  bool(): boolean {
    return !!this.args[this.index++];
  }
}
