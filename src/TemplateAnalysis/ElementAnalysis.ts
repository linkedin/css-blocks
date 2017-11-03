import {
  unionInto,
} from "../util/unionInto";
import {
  OptionsReader as CssBlocksOptionsReader,
} from "../OptionsReader";

import {
  Block,
  BlockObject,
  isBlock,
  isBlockClass,
  isState,
  State,
  StateParent,
} from "../Block";

import {
  ObjectDictionary,
  objectValues,
  MultiMap,
} from "@opticss/util";
import {
  Attribute,
  AttributeValueSetItem,
  Element,
  SourceLocation,
  Tagname,
  Value,
  ValueConstant,
  ValueAbsent,
  AttributeValueSet,
  AttributeValueChoice,
  AttributeValueChoiceOption,
  isConstant,
  POSITION_UNKNOWN,
} from "@opticss/template-api";

export interface HasState<Style extends State | number = State> {
  state: Style;
}

export function isBooleanState(o: object): o is HasState<State | number> {
  return !!(<HasState>o).state;
}

export interface HasGroup<Style extends State | number = State> {
  group: ObjectDictionary<Style>;
}

export function isStateGroup(o: object): o is HasGroup<State | number> {
  return !!(<HasGroup>o).group;
}

/**
 * A boolean condition.
 */
export interface Conditional<BooleanExpression> {
  condition: BooleanExpression;
}

export function isConditional(o: object): o is Conditional<any> {
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

export function isSwitch(o: object): o is Switch<any> {
  return o.hasOwnProperty('stringExpression');
}

/**
 * When the style container is dynamic but the style itself is not.
 */
export interface Dependency<Container extends StateParent | number = StateParent> {
  container: Container;
}

export function hasDependency(o: object): o is Dependency<StateParent | number> {
  return !!(<Dependency>o).container;
}

/**
 * the main branch of the style-if helper and the else branch of the
 * style-unless helper
 */
export interface TrueCondition<Container extends StateParent | number = StateParent> {
  whenTrue: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isTrueCondition(o: object): o is TrueCondition<StateParent | number> {
  return !!(<TrueCondition>o).whenTrue;
}

/**
 * the else branch of the style-if helper and the main branch of the
 * style-unless helper
 */
export interface FalseCondition<Container extends StateParent | number = StateParent> {
  whenFalse: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isFalseCondition(o: object): o is FalseCondition<StateParent | number> {
  return !!(<FalseCondition>o).whenFalse;
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
/** A group of states that are only set when its dynamic class is set */
export type DependentStateGroup = Dependency & HasGroup;
/** A group of states that are only set when its dynamic class is set and where one (or none) is selected at runtime. */
export type ConditionalDependentStateGroup<StringExpression> = Switch<StringExpression> & Dependency & HasGroup;
/** A group of states that are dynamic for any reason */
export type DynamicStateGroup<StringExpression> = ConditionalStateGroup<StringExpression> | DependentStateGroup | ConditionalDependentStateGroup<StringExpression>;

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
  static: Set<BlockObject>;

  /** blocks/classes set conditionally */
  dynamicClasses: Array<DynamicClasses<TernaryExpression>>;

  /** states set dynamically or depending on a dynamic class */
  dynamicStates: Array<DynamicStates<BooleanExpression, StringExpression>>;

  /** classes declared explicitly and found in at least one dynamic class expression. */
  private dynamicClassExpressions: Map<StateParent, DynamicClasses<TernaryExpression>>;

  /** All the classes on this element, by block. */
  private allClasses: MultiMap<Block, StateParent>;

  /**
   * All the static styles including styles implied by the explicitly specified
   * styles.
   */
  private allStaticStyles: Set<BlockObject>;

  /** whether all blocks and classes have been added and
   * the styles are in states mode now. */
  private inStateMode: boolean;

  constructor(location: SourceLocation, tagName?: string, id?: string) {
    this.id = id;
    this.tagName = tagName;
    this.sourceLocation = location;
    this.static = new Set();
    this.dynamicClasses = new Array();
    this.dynamicStates = new Array();
    this.dynamicClassExpressions = new Map();
    this.allClasses = new MultiMap<Block, StateParent>();
    this.allStaticStyles = new Set();
    this.inStateMode = false;
  }

  /**
   * Get a list of all possible block objects for the given block
   * on this element that can be used a parent for a state.
   *
   * Calling this method puts the element into "state mode".
   */
  classesForBlock(block: Block): Array<StateParent> {
    if (!this.inStateMode) this.prepareForStates();
    return this.allClasses.get(block);
  }

  /**
   * Checks if the given class or block is set on this element
   * of if it is implied by one of the other styles on this element.
   */
  hasClass(klass: StateParent) {
    return this.allClasses.get(klass.block).indexOf(klass) >= 0;
  }

  /**
   * iterate over all static and dynamic States explicitly set on this element
   * @param dynamic
   *   * undefined - return all states,
   *   * true - return only dynamic states
   *   * false - return only static states
   */
  *statesFound(dynamic?: boolean) {
    let found = new Set<State>();
    if (returnStatic(dynamic)) {
      for (let s of this.static) {
        if (isState(s)) {
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
   * @param dynamic
   *   * undefined - return all classes,
   *   * true - return only dynamic classes
   *   * false - return only static classes
   */
  *classesFound(dynamic?: boolean) {
    let found = new Set<StateParent>();
    if (returnStatic(dynamic)) {
      for (let s of this.static) {
        if (isBlock(s) || isBlockClass(s)) {
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
   * This is used to add any static state even if it is part of a group.
   * The state is added as dynamic and conditional on its class if that
   * class is dynamic.
   */
  addStaticState(state: State) {
    if (!this.inStateMode) this.prepareForStates();
    let container = state.parent!;
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicStates.push({state, container});
    } else {
      this.static.add(state);
      unionInto(this.allStaticStyles, state.resolveStyles());
    }
  }

  /**
   * Adds a state that is toggled on and off at runtime.
   *
   * @param state the state that is dynamic.
   * @param condition The AST node(s) representing this boolean expression.
   */
  addDynamicState(state: State, condition: BooleanExpression) {
    if (!this.inStateMode) this.prepareForStates();
    let container = state.parent!;
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
  addDynamicGroup(container: StateParent, group: ObjectDictionary<State>, stringExpression: StringExpression, disallowFalsy = false) {
    if (!this.inStateMode) this.prepareForStates();
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicStates.push({ group, container, stringExpression, disallowFalsy });
    } else {
      this.dynamicStates.push({ group, stringExpression, disallowFalsy });
    }
  }

  /**
   * Adds a state parent that is always set on this element.
   */
  addStaticClass(klass: StateParent) {
    if (this.inStateMode) {
      throw new Error("no classes can be added after a state.");
    }
    this.static.add(klass);
  }

  /**
   * Adds state parents that are set based on a conditional.
   * This is modeled as a ternary (if/else) expression.
   *
   * Nested ternaries are not supported at this time.
   */
  addDynamicClasses(classes: DynamicClasses<TernaryExpression>) {
    if (this.inStateMode) {
      throw new Error("no classes can be added after a state.");
    }
    this.dynamicClasses.push(classes);
  }

  /**
   * Get a simple object with no circular references that is possible to
   * emit and restore as JSON.
   *
   * @param styleIndexes a map of block objects to a number that represents
   *   it in the template analysis serialization.
   */
  serialize(styleIndexes: Map<BlockObject, number>): SerializedElementAnalysis {
    let staticStyles = new Array<number>();
    for (let style of this.allStaticStyles) {
      staticStyles.push(styleIndexes.get(style)!);
    }
    staticStyles.sort();
    let dynamicClasses = this.dynamicClasses.map(c => serializeDynamicContainer(c, styleIndexes));
    let dynamicStates = this.dynamicStates.map(s => serializeDynamicStates(s, styleIndexes));
    let serialization: SerializedElementAnalysis = {
      staticStyles,
      dynamicClasses,
      dynamicStates
    };
    if (this.tagName) {
      serialization.tagName = this.tagName;
    }
    if (this.sourceLocation.start.line !== POSITION_UNKNOWN.line) {
      serialization.sourceLocation = {
        start: { line: this.sourceLocation.start.line }
      };
      if (this.sourceLocation.start.column) {
        serialization.sourceLocation.start.column = this.sourceLocation.start.column;
      }
      if (this.sourceLocation.start.filename) {
        serialization.sourceLocation.start.filename = this.sourceLocation.start.filename;
      }
      if (this.sourceLocation.end) {
        serialization.sourceLocation.end = {
          line: this.sourceLocation.end.line
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
   * assumed to be unique per BlockObject across all blocks -- so these
   * maps can be merged safely.
   */
  forOptimizer(options: CssBlocksOptionsReader): [Element, Map<string, BlockObject>] {
    let tagValue = this.tagName ? Value.constant(this.tagName) : Value.unknown();
    let tagName = new Tagname(tagValue);
    let classes = new Array<AttributeValueSetItem>();
    let classMap = new Map<string, BlockObject>();
    for (let style of this.allStaticStyles) {
      let className = style.cssClass(options);
      classes.push(Value.constant(className));
      classMap.set(className, style);
    }

    let mapper: ClassMapper = mapClasses.bind(null, options, classMap);
    let choices: ChoiceMapper = mapChoiceClasses.bind(null, options, classMap);

    let depStatesMap = new MultiMap<StateParent, DynamicStates<BooleanExpression, StringExpression>>();
    for (let dynState of this.dynamicStates) {
      if (hasDependency(dynState)) {
        depStatesMap.set(dynState.container, dynState);
      }
    }

    let dynStatesHandled = new Set<DynamicStates<BooleanExpression, StringExpression>>();

    for (let dynContainer of this.dynamicClasses) {
      let trueClasses: AttributeValueSet | ValueConstant | ValueAbsent = Value.absent();
      let falseClasses: AttributeValueSet | ValueConstant | ValueAbsent = Value.absent();
      if (isTrueCondition(dynContainer)) {
        trueClasses = dynamicClassAndDependentStates(
          dynContainer.whenTrue, depStatesMap, dynStatesHandled, mapper, choices);
      }
      if (isFalseCondition(dynContainer)) {
        falseClasses = dynamicClassAndDependentStates(
          dynContainer.whenFalse, depStatesMap, dynStatesHandled, mapper, choices);
      }
      classes.push(Value.oneOf([trueClasses, falseClasses]));
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

    let classValue = Value.allOf(classes);
    let element = new Element(
      tagName,
      [new Attribute("class", classValue)],
      this.sourceLocation,
      this.id
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
    this.inStateMode = true;
    let classesToKeep = new Set<DynamicClasses<TernaryExpression>>();
    for (let c of this.static) {
      for (let implied of c.resolveStyles()) {
        this.allStaticStyles.add(implied);
        if (isBlock(implied) || isBlockClass(implied)) {
          // TODO: remove this cast
          this.allClasses.set(implied.block, <StateParent>implied);
        }
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
    let parents: Array<StateParent> = classes[condition];
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
          if (isBlock(implied) || isBlockClass(implied)) {
            this.dynamicClassExpressions.set(<StateParent>implied, classes);
            // TODO: remove this cast
            this.allClasses.set(implied.block, <StateParent>implied);
          }
        }
      }
    } else {
      delete classes[condition];
    }
  }

}

function dynamicClassAndDependentStates(
  classes: Array<StateParent>,
  depStatesMap: MultiMap<StateParent, DynamicStates<any, any>>,
  dynStatesHandled: Set<DynamicStates<any, any>>,
  mapper: ClassMapper,
  choices: ChoiceMapper
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
  return Value.allOf(classValues);
}

function addToSet(
  setItems: Array<AttributeValueSetItem>,
  value: ValueConstant | AttributeValueSet
): Array<AttributeValueSetItem> {
  if (isConstant(value)) {
    setItems.push(value);
  } else {
    setItems.push(...value.allOf);
  }
  return setItems;
}

type ClassMapper = (style: BlockObject) => ValueConstant | AttributeValueSet;
function mapClasses(
  options: CssBlocksOptionsReader,
  map: Map<string, BlockObject>,
  style: BlockObject
): ValueConstant | AttributeValueSet {
  let classes = new Array<string>();
  let resolvedStyles = style.resolveStyles();
  for (let resolvedStyle of resolvedStyles) {
    let cls = resolvedStyle.cssClass(options);
    map.set(cls, resolvedStyle);
    classes.push(cls);
  }
  if (classes.length === 1) {
    return Value.constant(classes[0]);
  } else {
    return Value.allOf(classes.map(c => Value.constant(c)));
  }
}

type ChoiceMapper = (includeAbsent: boolean, ...styles: BlockObject[]) => AttributeValueChoice;
function mapChoiceClasses(
  options: CssBlocksOptionsReader,
  map: Map<string, BlockObject>,
  includeAbsent: boolean,
  ...styles: BlockObject[]
): AttributeValueChoice {
  let choices = new Array<AttributeValueChoiceOption>();
  if (includeAbsent) {
    choices.push(Value.absent());
  }
  for (let style of styles) {
    choices.push(mapClasses(options, map, style));
  }
  return Value.oneOf(choices);
}

function serializeDynamicContainer(c: DynamicClasses<any>, styleIndexes: Map<BlockObject, number>): SerializedDynamicContainer {
  let classes: SerializedDynamicContainer = {
    condition: true,
    whenFalse: [],
    whenTrue: []
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

function serializeDynamicStates(c: DynamicStates<any, any>, styleIndexes: Map<BlockObject, number>): SerializedDynamicStates {
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