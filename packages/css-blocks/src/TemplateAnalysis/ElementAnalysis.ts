import {
  Attribute,
  AttributeValueChoice,
  AttributeValueChoiceOption,
  AttributeValueSet,
  AttributeValueSetItem,
  attrValues,
  Element,
  isConstant,
  POSITION_UNKNOWN,
  SourceLocation,
  Tagname,
  ValueAbsent,
  ValueConstant,
} from "@opticss/element-analysis";
import {
  MultiMap,
  ObjectDictionary,
  objectValues,
  whatever,
} from "@opticss/util";

import {
  Block,
  BlockClass,
  isBlockClass,
  isStateful,
  State,
  Style,
  SubState,
} from "../Block";
import {
  OptionsReader as CssBlocksOptionsReader,
} from "../OptionsReader";
import {
  unionInto,
} from "../util/unionInto";

export interface HasState<StateType extends State | SubState | number = State | SubState> {
  state: StateType;
}

export function isBooleanState(o: object): o is HasState<State | SubState | number> {
  return !!(<HasState>o).state;
}

export interface HasGroup<GroupType extends SubState | number = SubState> {
  group: ObjectDictionary<GroupType>;
}

export function isStateGroup(o: object): o is HasGroup<SubState | number> {
  return !!(<HasGroup>o).group;
}

/**
 * A boolean condition.
 */
export interface Conditional<BooleanExpression> {
  condition: BooleanExpression;
}

export function isConditional(o: object): o is Conditional<whatever> {
  return o.hasOwnProperty('condition');
}

/**
 * A string expression used to switch between states.
 * When falsy is allowed, it's possible to disable the states.
 */
export interface Switch<StringExpression> {
  stringExpression: StringExpression;
  /** whether the states can be disabled. */
  disallowFalsy?: boolean;
}

export function isSwitch(o: object): o is Switch<whatever> {
  return o.hasOwnProperty('stringExpression');
}

/**
 * When the style container is dynamic but the style itself is not.
 */
export interface Dependency<Container extends BlockClass | number = BlockClass> {
  container: Container;
}

export function hasDependency(o: object): o is Dependency<BlockClass | number> {
  let container = (<Dependency<BlockClass | number>>o).container;
  return container !== undefined;
}

/**
 * the main branch of the style-if helper and the else branch of the
 * style-unless helper
 */
export interface TrueCondition<Container extends BlockClass | number = BlockClass> {
  whenTrue: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isTrueCondition(o: object): o is TrueCondition<BlockClass | number> {
  let trueCondition = (<TrueCondition<BlockClass | number>>o).whenTrue;
  return trueCondition !== undefined;
}

/**
 * the else branch of the style-if helper and the main branch of the
 * style-unless helper
 */
export interface FalseCondition<Container extends BlockClass | number = BlockClass> {
  whenFalse: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isFalseCondition(o: object): o is FalseCondition<BlockClass | number> {
  let falseCondition = (<FalseCondition<BlockClass | number>>o).whenFalse;
  return falseCondition !== undefined;
}

interface StaticClass {
  klass: BlockClass;
}
function isStaticClass(o: object): o is StaticClass {
  return !!((<StaticClass>o).klass);
}

/** A state that is conditionally set */
export type ConditionalState<BooleanExpression> = Conditional<BooleanExpression> & HasState;
/** A state that is only set when its dynamic class is set */
export type DependentState = Dependency & HasState;
/** A state that is only set when its condition is true and its dynamic class is set */
export type ConditionalDependentState<BooleanExpression> = Conditional<BooleanExpression> & Dependency & HasState;
/** A state that is dynamic for any reason */
export type DynamicState<BooleanExpression> = ConditionalState<BooleanExpression> | DependentState | ConditionalDependentState<BooleanExpression>;

/** A group of states where one is set conditionally */
export type ConditionalStateGroup<StringExpression> = Switch<StringExpression> & HasGroup;
/** A group of states that are only set when its dynamic class is set and where one (or none) is selected at runtime. */
export type ConditionalDependentStateGroup<StringExpression> = Switch<StringExpression> & Dependency & HasGroup;
/** A group of states that are dynamic for any reason */
export type DynamicStateGroup<StringExpression> = ConditionalStateGroup<StringExpression> | ConditionalDependentStateGroup<StringExpression>;

/** Any type of dynamic state or group of states. */
export type DynamicStates<BooleanExpression, StringExpression> = DynamicState<BooleanExpression> | DynamicStateGroup<StringExpression>;

/** a ternary expression where different classes can be set when true or false */
export type DynamicClasses<TernaryExpression> = (Conditional<TernaryExpression> & TrueCondition) |
                                                (Conditional<TernaryExpression> & FalseCondition) |
                                                (Conditional<TernaryExpression> & TrueCondition & FalseCondition);

export type SerializedConditionalState = Conditional<true> & HasState<number>;
export type SerializedDependentState = Dependency<number> & HasState<number>;
export type SerializedConditionalDependentState = Conditional<true> & Dependency<number> & HasState<number>;
export type SerializedDynamicState = SerializedConditionalState | SerializedDependentState | SerializedConditionalDependentState;
export type SerializedConditionalStateGroup = Switch<true> & HasGroup<number>;
export type SerializedDependentStateGroup = Dependency<number> & HasGroup<number>;
export type SerializedConditionalDependentStateGroup = Switch<true> & Dependency<number> & HasGroup<number>;
export type SerializedDynamicStateGroup = SerializedConditionalStateGroup | SerializedDependentStateGroup | SerializedConditionalDependentStateGroup;
export type SerializedDynamicContainer = Conditional<true> & (TrueCondition<number> | FalseCondition<number> | (TrueCondition<number> & FalseCondition<number>));
export type SerializedDynamicStates = SerializedDynamicState | SerializedDynamicStateGroup;

export interface SerializedElementAnalysis {
  id?: string | undefined;
  tagName?: string | undefined;
  sourceLocation?: SourceLocation;
  staticStyles: Array<number>;
  dynamicClasses: Array<SerializedDynamicContainer>;
  dynamicStates: Array<SerializedDynamicStates>;
}

/**
 * This class is used to track the styles and dynamic expressions on an element
 * and produce a runtime class expression in conjunction with a style mapping.
 *
 * This class tracks dependencies between states and classes and the runtime
 * expression causes states to be removed if the parent class is not present at
 * runtime.
 *
 * With some syntaxes, if an element has different classes on it at runtime
 * from the same block, the states in use become ambiguous. To manage this,
 * the caller must ensure that the state names used exist for all possible
 * classes and produce an error if not. Then add the states for each
 * possible class with multiple calls to add(Static|Dynamic)(State|Group).
 * If the AST can't handle multiple references pointing at the expression node,
 * the caller must clone it -- This won't result in multiple expression
 * invocations unless multiple classes from the same block are applied at the
 * same time -- which would be illegal.
 */
export class ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
  static autoGenerateId = Symbol("AutoGenerateID");

  /** an opaque id assigned from the analyzer for later retrieval */
  id: string | undefined;

  /** The name of the tag these styles are applied -- if known. */
  tagName: string | undefined;

  /** where the element starts and ends */
  sourceLocation: SourceLocation;

  /** static styles explicitly declared on this element */
  static: Set<Style>;

  /** blocks/classes set conditionally */
  dynamicClasses: Array<DynamicClasses<TernaryExpression>>;

  /** states set dynamically or depending on a dynamic class */
  dynamicStates: Array<DynamicStates<BooleanExpression, StringExpression>>;

  private addedStyles: Array<DependentState
                             | ConditionalDependentState<BooleanExpression>
                             | ConditionalDependentStateGroup<StringExpression>
                             | StaticClass
                             | DynamicClasses<TernaryExpression>>;

  /** classes declared explicitly and found in at least one dynamic class expression. */
  private dynamicClassExpressions: Map<BlockClass, DynamicClasses<TernaryExpression>>;

  /** All the classes on this element, by block. */
  private allClasses: MultiMap<Block, BlockClass>;

  /**
   * All the static styles including styles implied by the explicitly specified
   * styles.
   */
  private allStaticStyles: Set<Style>;

  private _sealed: boolean;

  /** whether all styles have been added and the styles can be analyzed now. */
  get sealed(): boolean {
    return this._sealed;
  }

  constructor(location: SourceLocation, tagName?: string, id?: string) {
    this.id = id;
    this.tagName = tagName;
    this.sourceLocation = location;
    this.static = new Set();
    this.dynamicClasses = new Array();
    this.dynamicStates = new Array();
    this.dynamicClassExpressions = new Map();
    this.allClasses = new MultiMap<Block, BlockClass>(false);
    this.allStaticStyles = new Set();
    this.addedStyles = new Array();
    this._sealed = false;
  }

  hasStyles(): boolean {
    return this.addedStyles.length > 0;
  }

  /**
   * Get a list of all possible block objects for the given block
   * on this element that can be used a parent for a state.
   *
   * This can be called before or after being sealed.
   */
  classesForBlock(block: Block): Array<BlockClass> {
    return this.allClasses.get(block);
  }

  /**
   * Checks if the given class or block is set on this element
   * of if it is implied by one of the other styles on this element.
   *
   * This can be called before or after being sealed.
   */
  hasClass(klass: BlockClass): boolean {
    return this.allClasses.get(klass.block).indexOf(klass) >= 0;
  }

  /**
   * iterate over all static and dynamic States explicitly set on this element
   *
   * the analysis must be sealed to call this method.
   * @param dynamic
   *   * undefined - return all states,
   *   * true - return only dynamic states
   *   * false - return only static states
   */
  *statesFound(dynamic?: boolean) {
    this.assertSealed();
    let found = new Set<State | SubState>();
    if (returnStatic(dynamic)) {
      for (let s of this.static) {
        if (isStateful(s)) {
          found.add(s);
          yield s;
        }
      }
    }
    if (returnDynamic(dynamic)) {
      for (let dynState of this.dynamicStates) {
        if (isStateGroup(dynState)) {
          for (let s of objectValues(dynState.group)) {
            if (found.has(s)) continue;
            found.add(s);
            yield s;
          }
        } else {
          if (found.has(dynState.state)) continue;
          found.add(dynState.state);
          yield dynState.state;
        }
      }
    }
  }

  /**
   * iterate over all static and dynamic blocks and classes explicitly set on this element.
   *
   * the analysis must be sealed to call this method.
   * @param dynamic
   *   * undefined - return all classes,
   *   * true - return only dynamic classes
   *   * false - return only static classes
   */
  *classesFound(dynamic?: boolean) {
    this.assertSealed();
    let found = new Set<BlockClass>();
    if (returnStatic(dynamic)) {
      for (let s of this.static) {
        if (isBlockClass(s)) {
          found.add(s);
          yield s;
        }
      }
    }
    if (returnDynamic(dynamic)) {
      for (let dynClass of this.dynamicClasses) {
        if (isTrueCondition(dynClass)) {
          for (let s of dynClass.whenTrue) {
            if (found.has(s)) continue;
            found.add(s);
            yield s;
          }
        }
        if (isFalseCondition(dynClass)) {
          for (let s of dynClass.whenFalse) {
            if (found.has(s)) continue;
            found.add(s);
            yield s;
          }
        }
      }
    }
  }
  /**
   * This method indicates that all styles have been added
   * and can be analyzed and validated.
   */
  seal() {
    this.assertSealed(false);
    let styles: [
      Array<StaticClass | DynamicClasses<TernaryExpression>>,
      Array<DependentState | ConditionalDependentState<BooleanExpression> | ConditionalDependentStateGroup<StringExpression>>
    ] = [[], []];
    let [classStyles, stateStyles] = this.addedStyles.reduce(
      (res, style) => {
        if (isStaticClass(style) || isTrueCondition(style) || isFalseCondition(style)) {
          res[0].push(style);
        } else {
          res[1].push(style);
        }
        return res;
      },
      styles);

    for (let classStyle of classStyles) {
      if (isStaticClass(classStyle)) {
        this._addStaticClass(classStyle);
      } else {
        this._addDynamicClasses(classStyle);
      }
    }
    this.prepareForStates();
    for (let stateStyle of stateStyles) {
      if (isStateGroup(stateStyle)) {
        this._addDynamicGroup(stateStyle);
      } else if (isConditional(stateStyle)) {
        this._addDynamicState(stateStyle);
      } else {
        this._addStaticState(stateStyle);
      }
    }

    this._sealed = true;
  }

  /**
   * This is used to add any static state even if it is part of a group.
   * The state is added as dynamic and conditional on its class if that
   * class is dynamic.
   */
  addStaticState(container: BlockClass, state: State | SubState) {
    this.assertSealed(false);
    this.addedStyles.push({container, state});
  }
  private _addStaticState(style: DependentState) {
    let {container, state} = style;
    this.assertValidContainer(container, state);
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicStates.push({state, container});
    } else {
      this.static.add(state);
      unionInto(this.allStaticStyles, state.resolveStyles());
    }
  }

  private assertValidContainer(container: BlockClass, state: State | SubState) {
    if (container !== state.blockClass) {
      if (!container.resolveStyles().has(state.blockClass)) {
        throw new Error("container is not a valid container for the given state");
      }
    }
  }

  /**
   * Adds a state that is toggled on and off at runtime.
   *
   * @param state the state that is dynamic.
   * @param condition The AST node(s) representing this boolean expression.
   */
  addDynamicState(container: BlockClass, state: State | SubState, condition: BooleanExpression) {
    this.assertSealed(false);
    this.addedStyles.push({state, container, condition});
  }
  private _addDynamicState(style: ConditionalDependentState<BooleanExpression>) {
    let {container, state, condition} = style;
    this.assertValidContainer(container, state);
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicStates.push({ state, container, condition });
    } else {
      this.dynamicStates.push({ state, condition });
    }
  }

  /**
   * Adds a group of states that are toggled between at runtime.
   *
   * @param container The class or block root to which the states belong.
   * @param group The states that are to be chosen from. All must be sub states
   *   of the same group -- they can be from different blocks if they inherit.
   * @param condition The AST node(s) representing this group -- can be used
   *   by the rewriter. This is just an opaque value that is passed through.
   * @param disallowFalsy Whether a missing value is expected or should be
   *   a runtime error.
   */
  addDynamicGroup(container: BlockClass, group: ObjectDictionary<SubState>, stringExpression: StringExpression, disallowFalsy = false) {
    this.assertSealed(false);
    this.addedStyles.push({ container, group, stringExpression, disallowFalsy });
  }
  private _addDynamicGroup(style: ConditionalDependentStateGroup<StringExpression>) {
    let { container, group, stringExpression, disallowFalsy } = style;
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicStates.push({ group, container, stringExpression, disallowFalsy });
    } else {
      this.dynamicStates.push({ group, stringExpression, disallowFalsy });
    }
  }

  /**
   * Adds a state parent that is always set on this element.
   */
  addStaticClass(klass: BlockClass) {
    this.assertSealed(false);
    this.addedStyles.push({klass});
    // We have to record this information as we add classes so that the caller
    // can use it to find classes for states that it encounters.
    this.mapBlocksForClass(klass);
  }
  private _addStaticClass(style: StaticClass) {
    let {klass} = style;
    this.static.add(klass);
  }

  /**
   * this maps the class and all the classes that the explicit class implies
   * to all the blocks those classes belong to via inheritance.
   *
   * These classes become valid containers for states even if they are not
   * explicitly set on the element.
   */
  private mapBlocksForClass(klass: BlockClass) {
    let explicitBlock = klass.block;
    let blockHierarchy = new Set(explicitBlock.getAncestors());
    blockHierarchy.add(explicitBlock);
    let resolvedStyles = klass.resolveStyles();
    for (let style of resolvedStyles) {
      if (!isBlockClass(style)) continue;
      let implicitBlock = style.block;
      let hierarchy: Set<Block>;
      if (blockHierarchy.has(implicitBlock)) {
        hierarchy = blockHierarchy;
      } else {
        hierarchy = new Set(implicitBlock.getAncestors());
        hierarchy.add(implicitBlock);
      }
      for (let block of hierarchy) {
        this.allClasses.set(block, style);
      }
    }
  }

  /**
   * Adds state parents that are set based on a conditional.
   * This is modeled as a ternary (if/else) expression.
   *
   * Nested ternaries are not supported at this time.
   */
  addDynamicClasses(dynClasses: DynamicClasses<TernaryExpression>) {
    this.assertSealed(false);
    this.addedStyles.push(dynClasses);
    // We have to record this information as we add classes so that the caller
    // can use it to find classes for states that it encounters.
    if (isTrueCondition(dynClasses)) {
      for (let klass of dynClasses.whenTrue) {
        this.mapBlocksForClass(klass);
      }
    }
    if (isFalseCondition(dynClasses)) {
      for (let klass of dynClasses.whenFalse) {
        this.mapBlocksForClass(klass);
      }
    }
  }
  private _addDynamicClasses(dynClasses: DynamicClasses<TernaryExpression>) {
    this.dynamicClasses.push(dynClasses);
  }

  assertSealed(isSealed = true) {
    if (this._sealed === isSealed) return;
    throw new Error(`Internal Error: The analysis is ${ this._sealed ? '' : 'not yet '}sealed.`);
  }

  countAllStaticStyles(): number {
    this.assertSealed();
    return this.allStaticStyles.size;
  }
  *getAllStaticStyles() {
    this.assertSealed();
    let s;
    for (s of this.allStaticStyles) {
      yield s;
    }
    return;
  }

  /**
   * Get a simple object with no circular references that is possible to
   * emit and restore as JSON.
   *
   * @param styleIndexes a map of block objects to a number that represents
   *   it in the template analysis serialization.
   */
  serialize(styleIndexes: Map<Style, number>): SerializedElementAnalysis {
    this.assertSealed();
    let staticStyles = new Array<number>();
    for (let style of this.static) {
      staticStyles.push(styleIndexes.get(style)!);
    }
    staticStyles.sort();
    let dynamicClasses = this.dynamicClasses.map(c => serializeDynamicContainer(c, styleIndexes));
    let dynamicStates = this.dynamicStates.map(s => serializeDynamicStates(s, styleIndexes));
    let serialization: SerializedElementAnalysis = {
      staticStyles,
      dynamicClasses,
      dynamicStates,
    };
    if (this.tagName) {
      serialization.tagName = this.tagName;
    }
    if (this.sourceLocation.start.line !== POSITION_UNKNOWN.line) {
      serialization.sourceLocation = {
        start: { line: this.sourceLocation.start.line },
      };
      if (this.sourceLocation.start.column) {
        serialization.sourceLocation.start.column = this.sourceLocation.start.column;
      }
      if (this.sourceLocation.start.filename) {
        serialization.sourceLocation.start.filename = this.sourceLocation.start.filename;
      }
      if (this.sourceLocation.end) {
        serialization.sourceLocation.end = {
          line: this.sourceLocation.end.line,
        };
        if (this.sourceLocation.end.column) {
          serialization.sourceLocation.end.column = this.sourceLocation.end.column;
        }
        if (this.sourceLocation.end.filename) {
          serialization.sourceLocation.end.filename = this.sourceLocation.end.filename;
        }
      }
    }
    return serialization;
  }

  /**
   * Compute an OptiCSS element description and a map of class names back to
   * the block objects for use in re-writing.
   *
   * This mapping of classname to block object is stable and the keys can be
   * assumed to be unique per Style across all blocks -- so these
   * maps can be merged safely.
   */
  forOptimizer(options: CssBlocksOptionsReader): [Element, Map<string, Style>] {
    this.assertSealed();
    let tagValue = this.tagName ? attrValues.constant(this.tagName) : attrValues.unknown();
    let tagName = new Tagname(tagValue);
    let classes = new Array<AttributeValueSetItem>();
    let classMap = new Map<string, Style>();
    for (let style of this.allStaticStyles) {
      let className = style.cssClass(options);
      classes.push(attrValues.constant(className));
      classMap.set(className, style);
    }

    let mapper: ClassMapper = mapClasses.bind(null, options, classMap);
    let choices: ChoiceMapper = mapChoiceClasses.bind(null, options, classMap);

    let depStatesMap = new MultiMap<BlockClass, DynamicStates<BooleanExpression, StringExpression>>();
    for (let dynState of this.dynamicStates) {
      if (hasDependency(dynState)) {
        depStatesMap.set(dynState.container, dynState);
      }
    }

    let dynStatesHandled = new Set<DynamicStates<BooleanExpression, StringExpression>>();

    for (let dynContainer of this.dynamicClasses) {
      let trueClasses: AttributeValueSet | ValueConstant | ValueAbsent = attrValues.absent();
      let falseClasses: AttributeValueSet | ValueConstant | ValueAbsent = attrValues.absent();
      if (isTrueCondition(dynContainer)) {
        trueClasses = dynamicClassAndDependentStates(
          dynContainer.whenTrue, depStatesMap, dynStatesHandled, mapper, choices);
      }
      if (isFalseCondition(dynContainer)) {
        falseClasses = dynamicClassAndDependentStates(
          dynContainer.whenFalse, depStatesMap, dynStatesHandled, mapper, choices);
      }
      classes.push(attrValues.oneOf([trueClasses, falseClasses]));
    }

    for (let dynState of this.dynamicStates) {
      if (dynStatesHandled.has(dynState)) continue;
      if (hasDependency(dynState)) {
        throw new Error("internal error"); // all of these should have been processed
      }
      if (isStateGroup(dynState)) {
        classes.push(choices(true, ...objectValues(dynState.group)));
      } else {
        classes.push(choices(true, dynState.state));
      }
    }

    let classValue = attrValues.allOf(classes);
    let element = new Element(
      tagName,
      [new Attribute("class", classValue)],
      this.sourceLocation,
      this.id,
    );
    return [element, classMap];
  }

  /**
   * Because of the possibility for classes to inherit and imply
   * other classes, we need to convert any dynamic class
   * that is static because of another static class to be static
   * This ensures that otherwise static states won't get
   * hoisted into dynamic expressions because of a class dependency.
   */
  private prepareForStates() {
    let classesToKeep = new Set<DynamicClasses<TernaryExpression>>();
    for (let c of this.static) {
      for (let implied of c.resolveStyles()) {
        this.allStaticStyles.add(implied);
      }
    }
    for (let klass of this.dynamicClasses) {
      if (isTrueCondition(klass)) {
        this.prepareCondition(klass, "whenTrue");
      }
      if (isFalseCondition(klass)) {
        this.prepareCondition(klass, "whenFalse");
      }
      if (isTrueCondition(klass) || isFalseCondition(klass)) {
        classesToKeep.add(klass);
      }
    }
    this.dynamicClasses = this.dynamicClasses.filter(c => classesToKeep.has(c));
  }

  private prepareCondition(
    classes: DynamicClasses<TernaryExpression>,
    condition: 'whenTrue' | 'whenFalse',
  ) {
    let parents: Array<BlockClass> = classes[condition];
    let dynamicParents = parents.filter(c => {
      if (this.allStaticStyles.has(c)) {
        this.static.add(c);
        return false;
      } else {
        return true;
      }
    });

    if (dynamicParents.length > 0) {
      classes[condition] = dynamicParents;
      for (let c of dynamicParents) {
        for (let implied of c.resolveStyles()) {
          if (isBlockClass(implied)) {
            this.dynamicClassExpressions.set(implied, classes);
          }
        }
      }
    } else {
      delete classes[condition];
    }
  }

}

function dynamicClassAndDependentStates(
  classes: Array<BlockClass>,
  depStatesMap: MultiMap<BlockClass, DynamicStates<whatever, whatever>>,
  dynStatesHandled: Set<DynamicStates<whatever, whatever>>,
  mapper: ClassMapper,
  choices: ChoiceMapper,
): AttributeValueSet | ValueConstant {
  let classValues = new Array<AttributeValueSetItem>();
  for (let klass of classes) {
    let dynStates = depStatesMap.get(klass);
    unionInto(dynStatesHandled, dynStates);
    addToSet(classValues, mapper(klass));
    for (let dynState of dynStates) {
      if (isStateGroup(dynState)) {
        classValues.push(choices(isSwitch(dynState),
                                 ...objectValues(dynState.group)));
      } else {
        if (isConditional(dynState)) {
          classValues.push(choices(true, dynState.state));
        } else {
          addToSet(classValues, mapper(dynState.state));
        }
      }
    }
  }
  if (classValues.length === 1) {
    let v = classValues[0];
    if (isConstant(v)) return v;
  }
  return attrValues.allOf(classValues);
}

function addToSet(
  setItems: Array<AttributeValueSetItem>,
  value: ValueConstant | AttributeValueSet,
): Array<AttributeValueSetItem> {
  if (isConstant(value)) {
    setItems.push(value);
  } else {
    setItems.push(...value.allOf);
  }
  return setItems;
}

type ClassMapper = (style: Style) => ValueConstant | AttributeValueSet;
function mapClasses(
  options: CssBlocksOptionsReader,
  map: Map<string, Style>,
  style: Style,
): ValueConstant | AttributeValueSet {
  let classes = new Array<string>();
  let resolvedStyles = style.resolveStyles();
  for (let resolvedStyle of resolvedStyles) {
    let cls = resolvedStyle.cssClass(options);
    map.set(cls, resolvedStyle);
    classes.push(cls);
  }
  if (classes.length === 1) {
    return attrValues.constant(classes[0]);
  } else {
    return attrValues.allOf(classes.map(c => attrValues.constant(c)));
  }
}

type ChoiceMapper = (includeAbsent: boolean, ...styles: Style[]) => AttributeValueChoice;
function mapChoiceClasses(
  options: CssBlocksOptionsReader,
  map: Map<string, Style>,
  includeAbsent: boolean,
  ...styles: Style[],
): AttributeValueChoice {
  let choices = new Array<AttributeValueChoiceOption>();
  if (includeAbsent) {
    choices.push(attrValues.absent());
  }
  for (let style of styles) {
    choices.push(mapClasses(options, map, style));
  }
  return attrValues.oneOf(choices);
}

function serializeDynamicContainer(c: DynamicClasses<whatever>, styleIndexes: Map<Style, number>): SerializedDynamicContainer {
  let classes: SerializedDynamicContainer = {
    condition: true,
    whenFalse: [],
    whenTrue: [],
  };
  if (isTrueCondition(c)) {
    classes.whenTrue = c.whenTrue.map(s => styleIndexes.get(s)!).sort();
  } else {
    delete classes.whenTrue;
  }
  if (isFalseCondition(c)) {
    classes.whenFalse = c.whenFalse.map(s => styleIndexes.get(s)!).sort();
  } else {
    delete classes.whenFalse;
  }
  return classes;
}

function serializeDynamicStates(c: DynamicStates<whatever, whatever>, styleIndexes: Map<Style, number>): SerializedDynamicStates {
  let dynState = {
    stringExpression: true,
    condition: true,
    state: 0,
    group: {} as {[n: string]: number},
    container: 0,
    disallowFalsy: false,
  };
  if (!isConditional(c)) {
    delete dynState.condition;
  }
  if (!isSwitch(c)) {
    delete dynState.stringExpression;
    delete dynState.disallowFalsy;
  } else {
    if (c.disallowFalsy) {
      dynState.disallowFalsy = true;
    } else {
      delete dynState.disallowFalsy;
    }
  }
  if (hasDependency(c)) {
    dynState.container = styleIndexes.get(c.container)!;
  } else {
    delete dynState.container;
  }
  if (isStateGroup(c)) {
    delete dynState.state;
    for (let k of Object.keys(c.group)) {
      dynState.group[k] = styleIndexes.get(c.group[k])!;
    }
  } else {
    delete dynState.group;
    dynState.state = styleIndexes.get(c.state)!;
  }
  return dynState;
}

function returnStatic(dynamic: boolean | undefined) {
  return dynamic === false || dynamic === undefined;
}
function returnDynamic(dynamic: boolean | undefined) {
  return dynamic === true || dynamic === undefined;
}
