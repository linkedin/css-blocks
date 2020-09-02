
export type TernaryStyle = [
  /** Condition, index to a dynamic expression result which will be interpreted as truthy or falsy. */
  number,
  /** Global style indices that are applied when the condition is true. */
  Array<number>,
  /** Global style indices that are applied when the condition is false. */
  Array<number>,
];

export type BooleanStyle = [
  /** Condition, index to a dynamic expression result which will be interpreted as truthy or falsy. */
  number,
  /** Global style indices that are applied when the condition is true. */
  Array<number>,
];

export const enum FalsySwitchBehavior {
  error = 0,
  unset = 1,
  default = 2,
}

export type SwitchStyle = [
  /** Value, index to a dynamic expression result which will be interpreted as a string. */
  number,
  /** What to do if the value is falsy. */
  FalsySwitchBehavior,
  /** Index of the block the style belongs to. */
  number,
  /** name of attribute belonging to the specified block. */
  string,
];

export type BlockRef = [string] | [string, number];
export type StyleRef = [number, string];

export type RuntimeStyles = [
  /*blocks*/  Array<BlockRef>,
  /*styles*/  Array<StyleRef>,
  /*static*/  Array<number>,
  /*boolean*/ Array<BooleanStyle>,
  /*ternary*/ Array<TernaryStyle>,
  /*switch*/  Array<SwitchStyle>,
];
