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
          this.evaluateSwitchCondition(styleStates);
          break;
        default:
          throw new Error(`Unknown condition type ${condition}`);
      }
    }

    let stylesApplied = new Set<number>();
    for (let i = 0; i < this.styles.length; i++) {
      if (styleStates[i] && this.styles[i] !== null) {
        stylesApplied.add(this.styles[i]!);
      }
    }

    return stylesApplied;
  }
  evaluateSwitchCondition(styleStates: Array<boolean>) {
    let falsyBehavior = this.num();
    let currentValue = this.str(true, true);
    let numValues = this.num();
    let found = false;
    let legal: Array<String> = [];
    while (numValues--) {
      let v = this.str();
      legal.push(v);
      let match = (v === currentValue);
      found = found || match;
      let numStyles = this.num();
      while (numStyles--) {
        let s = this.num();
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
