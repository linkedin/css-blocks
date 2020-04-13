// Every CSS Block style is assigned a unique number that is globally unique
type GlobalStyleIndex = number;
// For clarity as to what type of information the strings are
type Classname = string;
type OptimizedClassname = string;
// this is a really fancy way to alias to `number`
type OutputClassnameIndex = Exclude<keyof AggregateRewriteData["outputClassnames"], string>;
// this is a really fancy way to alias to `number`
type GlobalBlockIndex = Exclude<keyof AggregateRewriteData["blocks"], string>;
// this is a really fancy way to alias to `number`
type OptimizationIndex = Exclude<keyof AggregateRewriteData["optimizations"], string>;

// These 5 lines are a compact AST for boolean expressions.
// Normally an AST would use objects with more expressive keys, but we want a
// more compact data structure in this AST for fewer bytes in our output.
// An array represents a sub-expression and the first element in that array indicates the
// sub-expression type.
//
// When a GlobalStyleIndex is encountered, that part of the boolean expression
// is considered true iff the current input state has that GlobalStyleIndex applied.
enum StyleExpressionType { AND = 1, OR = 2, NOT = 3 }
type StyleExpression = GlobalStyleIndex | AndStyleExpression | OrStyleExpression | NotStyleExpression;
type AndStyleExpression = [StyleExpressionType.AND, ...StyleExpression[]];
type OrStyleExpression = [StyleExpressionType.OR, ...StyleExpression[]];
type NotStyleExpression = [StyleExpressionType.NOT, StyleExpression];

interface AggregateRewriteData {
  // Maps a block's unique ID to an index of AggregateRewriteData["blocks"].
  blockIds: {
    [blockId: string]: GlobalBlockIndex;
  };
  blocks: Array<BlockInfo>;

  // This is a list of all the class names that might be returned by the rewrite helper
  // with the exception of public class names (block aliases) that are found in the styleImplications.
  // Note: classnames from the original source that are not optimized are also returned here.
  // Note: classnames from the original source that the optimizer has flagged as obsolete are not listed here.
  outputClassnames: Array<OptimizedClassname>;
  styleRequirements: {
    // The key is a GlobalStyleIndex.
    //
    // Value is an unordered set of GlobalStyleIndex values that must all be
    // applied to the element in order for the style to be applied.
    [styleIndex: number]: Array<GlobalStyleIndex>;
  };
  impliedStyles: {
    // The key is a GlobalStyleIndex
    //
    // Value is an unordered set.
    //   - GlobalStyleIndex: a style that is also applied in conjunction with the given style.
    //   - string: public class name (block alias) that is also applied in conjunction with the given style.
    //
    // Note: This list is only the directly implied styles. The full implication
    // graph is resolved at runtime.
    [styleIndex: number]: Array<GlobalStyleIndex | string>;
  };
  optimizations: [
    // Adds the class name to the output if the style expression matches the current input state.
    [OutputClassnameIndex, StyleExpression]
  ];
  possibleOptimizations: {
    // Key is a GlobalStyleIndex.
    // Value is a list of all outputs that might apply for the given GlobalStyleIndex.
    [styleIndex: number]: Array<OptimizationIndex>;
  };
}

interface BlockInfo {
  // The styles of this block
  // Note: this includes all the styles that are inherited but not overridden
  //       but does not include the styles that are inherited but then overridden.
  styles: Array<GlobalStyleIndex>;
  // Given a block that implements this block's interface or inherits from this interface
  // Get an array of GlobalStyleIndex values that directly correspond to the same index as BlockInfo["styles"].
  // Note: If an implementation inherits from this block, this array will contain
  //       GlobalStyleIndex values from this BlockInfo's styles wherever those styles
  //       are not overridden. Thus it is guaranteed that each value in `implementationStyles`
  //       has the same length as the `styles` array.
  implementationStyles: {
    // The key is a GlobalStyleIndex
    [blockIndex: number]: Array<GlobalStyleIndex>;
  };
}