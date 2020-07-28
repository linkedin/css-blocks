import {
  Attribute as Attr,
  AttributeValueChoice,
  AttributeValueChoiceOption,
  AttributeValueSet,
  AttributeValueSetItem,
  Element,
  POSITION_UNKNOWN,
  SourceLocation,
  Tagname,
  ValueAbsent,
  ValueConstant,
  attrValues,
  isConstant,
} from "@opticss/element-analysis";
import {
  MultiMap,
  ObjectDictionary,
  assertNever,
  objectValues,
} from "@opticss/util";

import {
  AttrValue,
  Attribute,
  Block,
  BlockClass,
  Composition,
  Style,
  isAttrValue,
  isBlockClass,
} from "../BlockTree";
import {
  ResolvedConfiguration,
} from "../configuration";
import {
  unionInto,
} from "../util/unionInto";

export interface HasAttrValue<T extends Style = Style> {
  value: Set<T>;
}

export function isBooleanAttr(o: object): o is HasAttrValue | SerializedHasAttrValue {
  return hasAttrValue(o);
}

export function hasAttrValue(o: object): o is HasAttrValue | SerializedHasAttrValue {
  if (!("value" in o)) return false;
  let value = (<HasAttrValue | SerializedHasAttrValue>o).value;
  return (Array.isArray(value) && value.length > 0)
         || (value instanceof Set && value.size > 0);
}

export interface HasGroup<GroupType extends BlockClass | AttrValue | number = AttrValue> {
  group: ObjectDictionary<GroupType>;
}

export function isAttrGroup(o: object): o is HasGroup<AttrValue | number> {
  return !!(<HasGroup>o).group;
}

/**
 * A boolean condition.
 */
export interface Conditional<BooleanExpression> {
  condition: BooleanExpression;
}

export function isConditional<BooleanExpression>(o: object): o is Conditional<BooleanExpression> {
  return "condition" in o;
}

/**
 * A string expression used to switch between attribute values.
 * When falsy is allowed, it's possible to disable the attribute.
 */
export interface Switch<StringExpression> {
  stringExpression: StringExpression;
  /** whether the attribute can be disabled. */
  disallowFalsy?: boolean;
}

export function isSwitch(o: object): o is Switch<unknown> {
  return "stringExpression" in o;
}

/**
 * When the style container is dynamic but the style itself is not.
 */
export interface Dependency<Container extends BlockClass | number = BlockClass> {
  container: Container;
}

export function hasDependency(o: object): o is Dependency<BlockClass | number> {
  return "container" in o;
}

/**
 * the main branch of the style-if helper and the else branch of the
 * style-unless helper
 */
export interface TrueCondition<Container extends BlockClass | number = BlockClass> {
  whenTrue: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isTrueCondition(o: object): o is TrueCondition<BlockClass | number> {
  return Array.isArray((<TrueCondition<BlockClass | number>>o).whenTrue);
}

/**
 * the else branch of the style-if helper and the main branch of the
 * style-unless helper
 */
export interface FalseCondition<Container extends BlockClass | number = BlockClass> {
  whenFalse: Array<Container>; // TODO: someday we can support more complex expressions here.
}

export function isFalseCondition(o: object): o is FalseCondition<BlockClass | number> {
  return Array.isArray((<FalseCondition<BlockClass | number>>o).whenFalse);
}

export interface StaticClass {
  klass: BlockClass;
}
export function isStaticClass(o: object): o is StaticClass | SerializedStaticClass {
  return ("klass" in o);
}

/** An attribute value that is conditionally set */
export type ConditionalAttr<BooleanExpression> = Conditional<BooleanExpression> & HasAttrValue;
/** An attribute value that is only set when its dynamic class is set */
export type DependentAttr = Dependency & HasAttrValue;
/** An attribute value that is only set when its condition is true and its dynamic class is set */
export type ConditionalDependentAttr<BooleanExpression> = Conditional<BooleanExpression> & Dependency & HasAttrValue;
/** An attribute value that is dynamic for any reason */
export type DynamicAttr<BooleanExpression> = ConditionalAttr<BooleanExpression> | DependentAttr | ConditionalDependentAttr<BooleanExpression>;

/** An attribute group where one is set conditionally */
export type ConditionalAttrGroup<StringExpression> = Switch<StringExpression> & HasGroup & HasAttrValue;
/** An attribute group that are only set when its dynamic class is set and where one (or none) is selected at runtime. */
export type ConditionalDependentAttrGroup<StringExpression> = Switch<StringExpression> & Dependency & HasGroup & HasAttrValue;
/** An attribute group that are dynamic for any reason */
export type DynamicAttrGroup<StringExpression> = ConditionalAttrGroup<StringExpression> | ConditionalDependentAttrGroup<StringExpression>;

/** Any type of dynamic attribute or group of attributes. */
export type DynamicAttrs<BooleanExpression, StringExpression> = DynamicAttr<BooleanExpression> | DynamicAttrGroup<StringExpression>;

/** a ternary expression where different classes can be set when true or false */
export type DynamicClasses<TernaryExpression> = (Conditional<TernaryExpression> & TrueCondition) |
                                                (Conditional<TernaryExpression> & FalseCondition) |
                                                (Conditional<TernaryExpression> & TrueCondition & FalseCondition);

export interface SerializedHasAttrValue {
  value: number[];
}
export interface SerializedStaticClass {
  klass: number;
}
export type SerializedConditionalAttr = Conditional<true> & SerializedHasAttrValue;
export type SerializedDependentAttr = Dependency<number> & SerializedHasAttrValue;
export type SerializedConditionalDependentAttr = Conditional<true> & Dependency<number> & SerializedHasAttrValue;
export type SerializedDynamicAttr = SerializedConditionalAttr | SerializedDependentAttr | SerializedConditionalDependentAttr;
export type SerializedConditionalAttrGroup = Switch<true> & HasGroup<number>;
export type SerializedDependentAttrGroup = Dependency<number> & HasGroup<number>;
export type SerializedConditionalDependentAttrGroup = Switch<true> & Dependency<number> & HasGroup<number>;
export type SerializedDynamicAttrGroup = SerializedConditionalAttrGroup | SerializedDependentAttrGroup | SerializedConditionalDependentAttrGroup;
export type SerializedDynamicContainer = Conditional<true> & (TrueCondition<number> | FalseCondition<number> | (TrueCondition<number> & FalseCondition<number>));
export type SerializedDynamicAttrs = SerializedDynamicAttr | SerializedDynamicAttrGroup;
export type SerializedDynamicClasses = (Conditional<true> & TrueCondition<number>)
                                       | (Conditional<true> & FalseCondition<number>)
                                       | (Conditional<true> & TrueCondition<number> & FalseCondition<number>);

export interface SerializedElementAnalysis {
  id?: string | undefined;
  tagName?: string | undefined;
  sourceLocation?: SourceLocation;
  staticStyles: Array<number>;
  dynamicClasses: Array<SerializedDynamicContainer>;
  dynamicAttributes: Array<SerializedDynamicAttrs>;
}

/**
 * This serialization is just the styles that were set explicitly
 * by the source code.
 */
export interface SerializedElementSourceAnalysis {
  id?: string | undefined;
  tagName?: string | undefined;
  sourceLocation?: SourceLocation;
  analyzedStyles: Array<SerializedAnalyzedStyle>;
}

type AnalyzedStyle<BooleanExpression, StringExpression, TernaryExpression> =
  DependentAttr
  | ConditionalDependentAttr<BooleanExpression>
  | ConditionalDependentAttrGroup<StringExpression>
  | StaticClass
  | DynamicClasses<TernaryExpression>;

type SerializedAnalyzedStyle =
  SerializedDependentAttr
  | SerializedConditionalDependentAttr
  | SerializedConditionalDependentAttrGroup
  | SerializedStaticClass
  | SerializedDynamicClasses;
/**
 * This class is used to track the styles and dynamic expressions on an element
 * and produce a runtime class expression in conjunction with a style mapping.
 *
 * This class tracks dependencies between attributes and classes and the runtime
 * expression causes attributes to be removed if the parent class is not present at
 * runtime.
 *
 * With some syntaxes, if an element has different classes on it at runtime
 * from the same block, the attributes in use become ambiguous. To manage this,
 * the caller must ensure that the attribute names used exist for all possible
 * classes and produce an error if not. Then add the attributes for each
 * possible class with multiple calls to add(Static|Dynamic)(Attribute|Attribute-Group).
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

  /** attributes set dynamically or depending on a dynamic class */
  dynamicAttributes: Array<DynamicAttrs<BooleanExpression, StringExpression>>;

  private explicitlyAddedStyles: Array<AnalyzedStyle<BooleanExpression, StringExpression, TernaryExpression>>;
  private addedStyles: Array<AnalyzedStyle<BooleanExpression, StringExpression, TernaryExpression>>;

  /** classes declared explicitly and found in at least one dynamic class expression. */
  private dynamicClassExpressions: Map<BlockClass, DynamicClasses<TernaryExpression>>;

  /** All the classes on this element, by block. */
  private allClasses: MultiMap<Block, BlockClass>;

  /** All the AttrValues on this element. */
  private allAttributes: Set<AttrValue>;

  /**
   * All the static styles including styles implied by the explicitly specified
   * styles.
   */
  private allStaticStyles: Set<Style>;

  private _sealed: boolean;

  private _reservedClassNames: Set<string>;

  /** whether all styles have been added and the styles can be analyzed now. */
  get sealed(): boolean {
    return this._sealed;
  }

  constructor(location: SourceLocation, reservedClassNames: Set<string>, tagName?: string, id?: string) {
    this.id = id;
    this.tagName = tagName;
    this.sourceLocation = location;
    this.static = new Set();
    this.dynamicClasses = new Array();
    this.dynamicAttributes = new Array();
    this.dynamicClassExpressions = new Map();
    this.allClasses = new MultiMap<Block, BlockClass>(false);
    this.allStaticStyles = new Set();
    this.allAttributes = new Set();
    this.addedStyles = new Array();
    this.explicitlyAddedStyles = new Array();
    this._sealed = false;
    this._reservedClassNames = reservedClassNames;
  }

  hasStyles(): boolean {
    return this.addedStyles.length > 0;
  }

  /**
   * Get a list of all possible block objects for the given block
   * on this element that can be used a parent for an attribute.
   *
   * This can be called before or after being sealed.
   */
  classesForBlock(block: Block): Array<BlockClass> {
    return this.allClasses.get(block);
  }

  blocksFound(): Array<Block> {
    return new Array(...this.allClasses.keys());
  }

  stylesFound(): Array<Style> {
    let styles = new Array<Style>();
    styles.push(...this.classesFound());
    styles.push(...this.attributesFound());
    return styles;
  }

  /**
   * Checks if the given class or block is set on this element,
   * or if it is implied by one of the other styles on this element.
   *
   * This can be called before or after being sealed.
   */
  hasClass(klass: BlockClass): boolean {
    return this.allClasses.get(klass.block).indexOf(klass) >= 0;
  }

  /**
   * Checks if the given AttrValue is possibly set on this element,
   * or if it is implied by one of the other styles on this element.
   *
   * This can be called before or after being sealed.
   */
  hasAttribute(attr: AttrValue): boolean {
    return this.allAttributes.has(attr);
  }

  /**
   * Iterate over all static and dynamic Attributes explicitly set on this element.
   * The analysis must be sealed to call this method.
   * @param dynamic
   *   * undefined - return all attributes,
   *   * true - return only dynamic attributes
   *   * false - return only static attributes
   */
  *attributesFound(dynamic?: boolean) {
    this.assertSealed();
    let found = new Set<AttrValue | Attribute>();
    if (returnStatic(dynamic)) {
      for (let s of this.static) {
        if (isAttrValue(s)) {
          found.add(s);
          yield s;
        }
      }
    }
    if (returnDynamic(dynamic)) {
      for (let dynAttr of this.dynamicAttributes) {
        if (isAttrGroup(dynAttr)) {
          // If an attribute group contains values, they are meant to override the applied values in a truthy case.
          if (dynAttr.value.size) {
            for (let s of dynAttr.value) {
              if (!isAttrValue(s)) { continue; }
              if (found.has(s)) { continue; }
              found.add(s);
              yield s;
            }
          }
          else {
            for (let s of objectValues(dynAttr.group)) {
              if (!isAttrValue(s)) { continue; }
              if (found.has(s)) { continue; }
              found.add(s);
              yield s;
            }
          }
        } else {
          for (let val of dynAttr.value) {
             // Composition allow for BlockClasses to be applied in this structure. Ensure we only return attrs.
            if (!isAttrValue(val)) { continue; }
            if (found.has(val)) { continue; }
            found.add(val);
            yield val;
          }
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

  /** Holds reference to all styles applied because of in-stylesheet composition. */
  private composedStyles: Set<Style> = new Set();

  /**
   * Test if a given style is applied because of in-stylesheet composition.
   * Used in validators to skip some of the more strict validation checks.
   * @param style Style to test.
   * @returns `true` or `false` depending on if the provided stye was applied because of an in-stylesheet composition.
   */
  isFromComposition(style: Style): boolean { return this.composedStyles.has(style); }

  /**
   * Given a condition, return whether or not it should be applied and under what conditions.
   * @param comp Composition  The Composition we're testing against this ElementAnalysis.
   * @returns True if should always be applied, False if should never be applied,
   *          otherwise an object detailing the application conditions.
   */
  private fetchConditions(comp: Composition):
    boolean
    | (Switch<StringExpression> & HasGroup<AttrValue>)
    | Conditional<BooleanExpression>
  {
    if (comp.conditions.length === 0) { return true; }
    let cond = comp.conditions[0];
    for (let style of this.addedStyles) {
      if (isAttrGroup(style) && style.group[cond.value] === cond) {
        return {
          group: { [cond.value]: comp.style as AttrValue },
          disallowFalsy: style.disallowFalsy,
          stringExpression: style.stringExpression,
        };
      }
      else if (isBooleanAttr(style) && style.value.has(cond)) {
        return isConditional(style) ? { condition: style.condition } : true;
      }
    }
    return false;
  }

  getSourceAnalysis(): ElementSourceAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
    this.assertSealed(true);
    return new ElementSourceAnalysis(this.explicitlyAddedStyles);
  }

  /**
   * This method indicates that all styles have been added
   * and can be analyzed and validated.
   */
  seal() {
    this.assertSealed(false);
    this.explicitlyAddedStyles = [...this.addedStyles];

    // After template analysis is done, we need to add all composed styles.
    // Conflict validation is done at Block construction time for these.
    // For every added style, check if it has a composition and apply those
    // composed class values appropriately. Because these are applied by the
    // build, track all Styles applied through stylesheet composition for each
    // element so we can exclude them from the strict compositional validators.
    for (let style of this.addedStyles) {

      // if this class is applied statically,
      if (isStaticClass(style)) {
        // Get all composed styles from the entire inheritance chain.
        for (let comp of style.klass.resolveComposedStyles()) {
          // Determine the classes we're applying. States have their parent classes automagically applied.
          const value = new Set(isAttrValue(comp.style) ? [comp.style.blockClass, comp.style] : [comp.style]);
          // Fetch the conditions we're applying these values under.
          const conditions = this.fetchConditions(comp);
          // If we won't ever need to apply these values, move on.
          if (conditions === false) { continue; }
          // If we should always apply these conditions, statically apply what makes sense for the BlockObj.
          else if (conditions === true) {
            if (isAttrValue(comp.style)) {
              this.addedStyles.push({ klass: comp.style.blockClass });
              this.addedStyles.push({ container: comp.style.blockClass, value: new Set([comp.style]) });
            }
            else {
              this.addedStyles.push({ klass: comp.style });
            }
          }
          // Otherwise, these styles will be applied under these certain conditions.
          else {
            this.addedStyles.push({
              value,
              container: style.klass,
              ...conditions,
            });
          }

          // Track these added styles as composed styles.
          value.forEach((o) => this.composedStyles.add(o));
        }
      }
      // Same as above but for truthy dynamic classes. We will never have fully static attributes in this case.
      if (isTrueCondition(style)) {
        for (let klass of style.whenTrue) {
          for (let comp of klass.resolveComposedStyles()) {
            const value = new Set(isAttrValue(comp.style) ? [comp.style.blockClass, comp.style] : [comp.style]);
            let conditions = this.fetchConditions(comp);
            if (conditions === false) { continue; }
            this.addedStyles.push({
              value,
              container: klass,
              ...conditions === true ? {} : conditions,
            });
            value.forEach((o) => this.composedStyles.add(o));
          }
        }
      }

      // Same as above but for falsy dynamic classes. We will never have fully static attributes in this case.
      if (isFalseCondition(style)) {
        for (let klass of style.whenFalse) {
          for (let comp of klass.resolveComposedStyles()) {
            const value = new Set(isAttrValue(comp.style) ? [comp.style.blockClass, comp.style] : [comp.style]);
            const conditions = this.fetchConditions(comp);
            if (conditions === false) { continue; }
            if (conditions === true ) {
              this.addedStyles.push({
                value,
                container: klass,
              });
            } else {
              this.addedStyles.push({
                value,
                container: klass,
                ...conditions,
              });
            }
            value.forEach((o) => this.composedStyles.add(o));
          }
        }
      }
    }

    let classStyles = new Array<StaticClass | DynamicClasses<TernaryExpression>>();
    let attrStyles = new Array<DependentAttr | ConditionalDependentAttr<BooleanExpression> | ConditionalDependentAttrGroup<StringExpression>>();
    for (let style of this.addedStyles) {
      if (isStaticClass(style) || isTrueCondition(style) || isFalseCondition(style)) {
        classStyles.push(style);
      } else {
        attrStyles.push(style);
      }
    }

    for (let classStyle of classStyles) {
      if (isStaticClass(classStyle)) {
        this._addStaticClass(classStyle);
      } else {
        this._addDynamicClasses(classStyle);
      }
    }
    this.prepareForAttributes();
    for (let attrStyle of attrStyles) {
      if (isAttrGroup(attrStyle)) {
        this._addDynamicGroup(attrStyle);
      } else if (isConditional(attrStyle)) {
        this._addDynamicAttr(attrStyle);
      } else {
        this._addStaticAttr(attrStyle);
      }
    }

    this._sealed = true;
  }

  /**
   * This is used to add any static AttrValue even if it is part of an attribute group.
   * The AttrValue is added as dynamic and conditional on its class if that
   * class is dynamic.
   */
  addStaticAttr(container: BlockClass, value: AttrValue) {
    this.assertSealed(false);
    this.addedStyles.push({ container, value: new Set([value]) });
    this.mapForAttribute(value);
  }
  private _addStaticAttr(style: DependentAttr) {
    let {container, value} = style;
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicAttributes.push({value, container});
    } else {
      for (let o of value) {
        this.static.add(o);
        unionInto(this.allStaticStyles, o.resolveStyles());
      }
    }
  }

  /**
   * Adds an AttrValue that is toggled on and off at runtime.
   *
   * @param value the AttrValue that is dynamic.
   * @param condition The AST node(s) representing this boolean expression.
   */
  addDynamicAttr(container: BlockClass, value: AttrValue, condition: BooleanExpression) {
    this.assertSealed(false);
    this.addedStyles.push({ value: new Set([value]), container, condition });
    this.mapForAttribute(value);
  }
  private _addDynamicAttr(style: ConditionalDependentAttr<BooleanExpression>) {
    let {container, value, condition} = style;
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicAttributes.push({ value, container, condition });
    } else {
      this.dynamicAttributes.push({ value, condition });
    }
  }

  /**
   * Adds a group of AttrValues that are toggled between at runtime.
   *
   * @param container The class or block root to which the AttrValues belong.
   * @param group The AttrValues that are to be chosen from. All must be children
   *   of the same group -- they can be from different blocks if they inherit.
   * @param condition The AST node(s) representing this group -- can be used
   *   by the rewriter. This is just an opaque value that is passed through.
   * @param disallowFalsy Whether a missing value is expected or should be
   *   a runtime error.
   */
  addDynamicGroup(container: BlockClass, group: Attribute, stringExpression: StringExpression, disallowFalsy = false) {
    this.assertSealed(false);
    this.addedStyles.push({
      container,
      group: group.resolveValuesHash(),
      value: new Set(),
      stringExpression,
      disallowFalsy,
    });
    for (let attr of group.values()) {
      this.mapForAttribute(attr);
    }
  }
  private _addDynamicGroup(style: ConditionalDependentAttrGroup<StringExpression>) {
    let { container, group, stringExpression, disallowFalsy, value } = style;
    if (this.dynamicClassExpressions.has(container)) {
      this.dynamicAttributes.push({ group, container, stringExpression, disallowFalsy, value });
    } else {
      this.dynamicAttributes.push({ group, stringExpression, disallowFalsy, value });
    }
  }

  /**
   * Adds a AttrValue parent (BlockClass) that is always set on this element.
   */
  addStaticClass(klass: BlockClass) {
    this.assertSealed(false);
    this.addedStyles.push({klass});
    // We have to record this information as we add classes so that the caller
    // can use it to find classes for AttrValues that it encounters.
    this.mapBlocksForClass(klass);
  }
  private _addStaticClass(style: StaticClass) {
    let {klass} = style;
    this.static.add(klass);
  }

  private mapForAttribute(attr: AttrValue) {
    for (let obj of attr.resolveStyles()) {
      this.allAttributes.add(obj);
    }
  }

  /**
   * Map the class and all the classes that the explicit class implies
   * to all the blocks those classes belong to via inheritance.
   *
   * These classes become valid containers for AttrValues even if they are not
   * explicitly set on the element.
   */
  private mapBlocksForClass(klass: BlockClass) {
    this.allClasses.set(klass.block, klass);
    for (let otherClass of klass.resolveInheritance()) {
      this.allClasses.set(otherClass.block, otherClass);
    }
  }

  /**
   * Adds BlockClasses that are set based on a conditional.
   * This is modeled as a ternary (if/else) expression.
   *
   * Nested ternaries are not supported at this time.
   */
  addDynamicClasses(dynClasses: DynamicClasses<TernaryExpression>) {
    this.assertSealed(false);
    this.addedStyles.push(dynClasses);
    // We have to record this information as we add classes so that the caller
    // can use it to find classes for AttrValues that it encounters.
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
    throw new Error(`Internal Error: The analysis is ${ this._sealed ? "" : "not yet "}sealed.`);
  }

  countAllStaticStyles(): number {
    this.assertSealed();
    return this.allStaticStyles.size;
  }
  *getAllStaticStyles(): IterableIterator<Style> {
    this.assertSealed();
    let s: Style;
    for (s of this.allStaticStyles) {
      yield s;
    }
    return;
  }

  /**
   * Only serializes the styles that were added during source analysis.
   */
  serializeSourceAnalysis(styleIndexes: Map<Style, number>): SerializedElementSourceAnalysis {
    let indexOf = (style: Style) => {
      if (styleIndexes.has(style)) {
        return styleIndexes.get(style)!;
      } else {
        throw new Error("[internal error] Style missing");
      }
    };
    let id = this.id;
    let tagName = this.tagName;
    let sourceLocation = this.sourceLocation;
    let analyzedStyles = new Array<SerializedAnalyzedStyle>();
    let addedStyles = this.sealed ? this.explicitlyAddedStyles : this.addedStyles;
    for (let s of addedStyles) {
      let serialized: Partial<SerializedAnalyzedStyle> = {};
      if (isStaticClass(s)) {
        (<SerializedStaticClass>serialized).klass = indexOf(s.klass);
      }
      if (isConditional(s)) {
        (<Conditional<true>>serialized).condition = true;
      }
      if (isTrueCondition(s)) {
        (<TrueCondition<number>>serialized).whenTrue = s.whenTrue.map(indexOf);
      }
      if (isFalseCondition(s)) {
        (<FalseCondition<number>>serialized).whenFalse = s.whenFalse.map(indexOf);
      }
      if (hasDependency(s)) {
        (<Dependency<number>>serialized).container = indexOf(s.container);
      }
      if (hasAttrValue(s)) {
        (<SerializedHasAttrValue>serialized).value = [...s.value].map(indexOf);
      }
      if (isAttrGroup(s)) {
        let group: ObjectDictionary<number> = {};
        for (let name of Object.keys(s.group)) {
          group[name] = indexOf(s.group[name]);
        }
        (<HasGroup<number>>serialized).group = group;
        (<Switch<true>>serialized).stringExpression = true;
        (<Switch<true>>serialized).disallowFalsy = s.disallowFalsy;
      }
      analyzedStyles.push(<Required<SerializedAnalyzedStyle>>serialized);
    }
    return {
      id,
      tagName,
      sourceLocation,
      analyzedStyles,
    };
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
    let dynamicClasses = this.dynamicClasses.map(c => this.serializeDynamicContainer(c, styleIndexes));
    let dynamicAttributes = this.dynamicAttributes.map(s => this.serializeDynamicAttrs(s, styleIndexes));
    let serialization: SerializedElementAnalysis = {
      staticStyles,
      dynamicClasses,
      dynamicAttributes,
    };
    if (this.tagName) {
      serialization.tagName = this.tagName;
    }
    if (this.sourceLocation.start.line !== POSITION_UNKNOWN.line) {
      serialization.sourceLocation = {
        start: { line: this.sourceLocation.start.line },
      };
      if (typeof this.sourceLocation.start.column === "number") {
        serialization.sourceLocation.start.column = this.sourceLocation.start.column;
      }
      if (this.sourceLocation.start.filename) {
        serialization.sourceLocation.start.filename = this.sourceLocation.start.filename;
      }
      if (this.sourceLocation.end) {
        serialization.sourceLocation.end = {
          line: this.sourceLocation.end.line,
        };
        if (typeof this.sourceLocation.end.column === "number") {
          serialization.sourceLocation.end.column = this.sourceLocation.end.column;
        }
        if (this.sourceLocation.end.filename) {
          serialization.sourceLocation.end.filename = this.sourceLocation.end.filename;
        }
      }
    }
    return serialization;
  }

  private serializeDynamicContainer(c: DynamicClasses<TernaryExpression>, styleIndexes: Map<Style, number>): SerializedDynamicContainer {
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

  private serializeDynamicAttrs(c: DynamicAttrs<BooleanExpression, StringExpression>, styleIndexes: Map<Style, number>): SerializedDynamicAttrs {
    let dynAttr = {
      stringExpression: true,
      condition: true,
      value: [0],
      group: {} as ObjectDictionary<number>,
      container: 0,
      disallowFalsy: false,
    };
    if (!isConditional(c)) {
      delete dynAttr.condition;
    }
    if (!isSwitch(c)) {
      delete dynAttr.stringExpression;
      delete dynAttr.disallowFalsy;
    } else {
      if (c.disallowFalsy) {
        dynAttr.disallowFalsy = true;
      } else {
        delete dynAttr.disallowFalsy;
      }
    }
    if (hasDependency(c)) {
      dynAttr.container = styleIndexes.get(c.container)!;
    } else {
      delete dynAttr.container;
    }
    if (isAttrGroup(c)) {
      delete dynAttr.value;
      for (let k of Object.keys(c.group)) {
        dynAttr.group[k] = styleIndexes.get(c.group[k])!;
      }
    } else {
      delete dynAttr.group;
    }
    dynAttr.value = [...c.value].map((o) => styleIndexes.get(o)!);
    return dynAttr;
  }

  /**
   * Compute an OptiCSS element description and a map of class names back to
   * the block objects for use in re-writing.
   *
   * This mapping of classname to block object is stable and the keys can be
   * assumed to be unique per Style across all blocks -- so these
   * maps can be merged safely.
   */
  forOptimizer(configuration: ResolvedConfiguration): [Element, Map<string, Style>] {
    this.assertSealed();
    let tagValue = this.tagName ? attrValues.constant(this.tagName) : attrValues.unknown();
    let tagName = new Tagname(tagValue);
    let classes = new Array<AttributeValueSetItem>();
    let classMap = new Map<string, Style>();
    for (let style of this.allStaticStyles) {
      let classNames = style.cssClassesWithAliases(configuration, this._reservedClassNames);
      classNames.forEach(className => {
        classes.push(attrValues.constant(className));
        classMap.set(className, style);
      });
    }

    let mapper: ClassMapper = mapClasses.bind(null, configuration, this._reservedClassNames, classMap);
    let choices: ChoiceMapper = mapChoiceClasses.bind(null, configuration, this._reservedClassNames, classMap);

    let depAttrsMap = new MultiMap<BlockClass, DynamicAttrs<BooleanExpression, StringExpression>>();
    for (let dynAttr of this.dynamicAttributes) {
      if (hasDependency(dynAttr)) {
        depAttrsMap.set(dynAttr.container, dynAttr);
      }
    }

    let dynAttrsHandled = new Set<DynamicAttrs<BooleanExpression, StringExpression>>();

    for (let dynContainer of this.dynamicClasses) {
      let trueClasses: AttributeValueSet | ValueConstant | ValueAbsent = attrValues.absent();
      let falseClasses: AttributeValueSet | ValueConstant | ValueAbsent = attrValues.absent();
      if (isTrueCondition(dynContainer)) {
        trueClasses = dynamicClassAndDependentAttrs(
          dynContainer.whenTrue, depAttrsMap, dynAttrsHandled, mapper, choices);
      }
      if (isFalseCondition(dynContainer)) {
        falseClasses = dynamicClassAndDependentAttrs(
          dynContainer.whenFalse, depAttrsMap, dynAttrsHandled, mapper, choices);
      }
      classes.push(attrValues.oneOf([trueClasses, falseClasses]));
    }

    for (let dynAttr of this.dynamicAttributes) {
      if (dynAttrsHandled.has(dynAttr)) continue;
      if (hasDependency(dynAttr)) {
        throw new Error("internal error"); // all of these should have been processed
      }
      if (isAttrGroup(dynAttr)) {
        classes.push(choices(true, ...objectValues(dynAttr.group)));
        classes.push(choices(true, ...dynAttr.value));

      } else {
        for (let val of dynAttr.value) {
          classes.push(choices(true, val));
        }
      }
    }

    let classValue = attrValues.allOf(classes);
    let element = new Element(
      tagName,
      [new Attr("class", classValue)],
      this.sourceLocation,
      this.id,
    );
    return [element, classMap];
  }

  /**
   * Because of the possibility for classes to inherit and imply
   * other classes, we need to convert any dynamic class
   * that is static because of another static class to be static
   * This ensures that otherwise static AttrValues won't get
   * hoisted into dynamic expressions because of a class dependency.
   */
  private prepareForAttributes() {
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
    condition: "whenTrue" | "whenFalse",
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

/**
 * The source analysis is useful when the code wants an exact view of what styles
 * were explicitly set on an element.
 */
export class ElementSourceAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
  addedStyles: AnalyzedStyle<BooleanExpression, StringExpression, TernaryExpression>[];
  blocksFound: Set<Block>;
  stylesFound: Set<Style>;
  /**
   * Styles that are always applied by the author.
   * This includes styles that are disabled if a dynamic dependency isn't present. */
  staticStyles: Array<Style>;
  ternaryStyles: Array<DynamicClasses<TernaryExpression>>;
  booleanStyles: Array<ConditionalAttr<BooleanExpression>>;
  switchStyles: Array<DynamicAttrGroup<StringExpression>>;

  constructor(addedStyles: Array<AnalyzedStyle<BooleanExpression, StringExpression, TernaryExpression>>) {
    this.addedStyles = addedStyles;
    this.blocksFound = new Set();
    this.stylesFound = new Set<Style>();
    this.staticStyles = [];
    this.ternaryStyles = [];
    this.booleanStyles = [];
    this.switchStyles = [];
    for (let s of addedStyles) {
      if (isStaticClass(s)) {
        this.staticStyles.push(s.klass);
        this.stylesFound.add(s.klass);
        this.blocksFound.add(s.klass.block);
      } else if (isSwitch(s)) {
        this.switchStyles.push(s);
        for (let k of Object.keys(s.group)) {
          this.stylesFound.add(s.group[k]);
          this.blocksFound.add(s.group[k].block);
        }
      } else if (isTrueCondition(s) || isFalseCondition(s)) {
        this.ternaryStyles.push(s);
        if (isTrueCondition(s)) {
          for (let c of s.whenTrue) {
            this.stylesFound.add(c);
            this.blocksFound.add(c.block);
          }
        }
        if (isFalseCondition(s)) {
          for (let c of s.whenFalse) {
            this.stylesFound.add(c);
            this.blocksFound.add(c.block);
          }
        }
      } else if (isConditional(s)) {
        this.booleanStyles.push(s);
        for (let style of s.value) {
          this.stylesFound.add(style);
          this.blocksFound.add(style.block);
        }
      } else if (hasDependency(s)) {
        // we don't need to track dependencies in the source view because it's a
        // dynamic behavior that is decided by the style relationships and not
        // based on what was authored for the dependent style. Since it wasn't
        // also one of the dynamic types it must be static.
        for (let style of s.value) {
          this.staticStyles.push(style);
          this.stylesFound.add(style);
          this.blocksFound.add(style.block);
        }
      } else {
        assertNever(s);
      }
    }
    for (let b1 of this.blocksFound) {
      for (let b2 of this.blocksFound) {
        if (b1.isAncestorOf(b2)) {
          this.blocksFound.delete(b1);
        }
      }
    }
  }

  size(): number {
    return this.addedStyles.length;
  }
}

function dynamicClassAndDependentAttrs<BooleanExpression, StringExpression>(
  classes: Array<BlockClass>,
  depAttrsMap: MultiMap<BlockClass, DynamicAttrs<BooleanExpression, StringExpression>>,
  dynAttrsHandled: Set<DynamicAttrs<BooleanExpression, StringExpression>>,
  mapper: ClassMapper,
  choices: ChoiceMapper,
): AttributeValueSet | ValueConstant {
  let classValues = new Array<AttributeValueSetItem>();
  for (let klass of classes) {
    let dynAttrs = depAttrsMap.get(klass);
    unionInto(dynAttrsHandled, dynAttrs);
    addToSet(classValues, mapper(klass));
    for (let dynAttr of dynAttrs) {
      if (isAttrGroup(dynAttr)) {
        classValues.push(choices(isSwitch(dynAttr), ...objectValues(dynAttr.group)));
        classValues.push(choices(isSwitch(dynAttr), ...dynAttr.value));
      } else {
        if (isConditional(dynAttr)) {
          for (let val of dynAttr.value) {
            classValues.push(choices(true, val));
          }
        } else {
          for (let val of dynAttr.value) {
            addToSet(classValues, mapper(val));
          }
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
  configuration: ResolvedConfiguration,
  reservedClassNames: Set<string>,
  map: Map<string, Style>,
  style: Style,
): ValueConstant | AttributeValueSet {
  let classes = new Array<string>();
  let resolvedStyles = style.resolveStyles();
  for (let resolvedStyle of resolvedStyles) {
    // TODO: update with a non empty set here
    let classNames = [resolvedStyle.cssClass(configuration, reservedClassNames)];
    classNames.push(...resolvedStyle.getStyleAliases());
    for (let cls of classNames) {
      map.set(cls, resolvedStyle);
      classes.push(cls);
    }
  }
  if (classes.length === 1) {
    return attrValues.constant(classes[0]);
  } else {
    return attrValues.allOf(classes.map(c => attrValues.constant(c)));
  }
}

type ChoiceMapper = (includeAbsent: boolean, ...styles: Style[]) => AttributeValueChoice;
function mapChoiceClasses(
  configuration: ResolvedConfiguration,
  reservedClassNames: Set<string>,
  map: Map<string, Style>,
  includeAbsent: boolean,
  /* tslint:disable-next-line */
  ...styles: Style[]
): AttributeValueChoice {
  let choices = new Array<AttributeValueChoiceOption>();
  if (includeAbsent) {
    choices.push(attrValues.absent());
  }
  for (let style of styles) {
    choices.push(mapClasses(configuration, reservedClassNames, map, style));
  }
  return attrValues.oneOf(choices);
}

function returnStatic(dynamic: boolean | undefined) {
  return dynamic === false || dynamic === undefined;
}
function returnDynamic(dynamic: boolean | undefined) {
  return dynamic === true || dynamic === undefined;
}
