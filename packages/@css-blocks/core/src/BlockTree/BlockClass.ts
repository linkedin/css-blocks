import { Attribute as Attr, AttributeValue, attrValues } from "@opticss/element-analysis";
import { assertNever } from "@opticss/util";
import { isString } from "util";

import { ATTR_PRESENT, AttrToken, ROOT_CLASS } from "../BlockSyntax";
import { BlockPath } from "../BlockSyntax";
import { OutputMode, ResolvedConfiguration } from "../configuration";
import { unionInto } from "../util/unionInto";

import { Attribute } from "./Attribute";
import { AttrValue } from "./AttrValue";
import { Block } from "./Block";
import { RulesetContainer } from "./RulesetContainer";
import { Style } from "./Style";
import { Styles } from "./Styles";

function ensureToken(input: AttrToken | string): AttrToken {
  let token: AttrToken | string | undefined = input;
  if (isString(token)) { token = new BlockPath(token).attribute; }
  if (!token) {
    throw new Error("Block path is not a valid attribute selector.");
  }
  return token;
}

export interface Composition {
  style: Styles;
  conditions: AttrValue[];
}

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends Style<BlockClass, Block, Block, Attribute> {
  private _sourceAttribute: Attr | undefined;
  private _composedStyles: Set<Composition> = new Set();
  private _resolvedComposedStyles: Set<Composition> | undefined;

  public readonly rulesets: RulesetContainer<BlockClass>;

  constructor(name: string, parent: Block, index: number) {
    super(name, parent, index);
    this.rulesets = new RulesetContainer(this);
  }

  protected get ChildConstructor(): typeof Attribute { return Attribute; }

  /** @returns This BlockClass' class name. */
  public get name(): string { return this.uid; }

  get isRoot(): boolean { return this.name === ROOT_CLASS; }

  public attributes(): Attribute[] { return this.children(); }
  public getAttributes(): Attribute[] { return this.children(); }
  public getAttribute(token: AttrToken | string): Attribute | null {
    return this.getChild(ensureToken(token));
  }

  public resolveAttribute(token: AttrToken | string): Attribute | null {
    return this.resolveChild(ensureToken(token));
  }

  /**
   * Ensure that an `Attribute` with the given name exists. If the `Attribute`
   * does not exist, it is created.
   * @param name The Attribute to ensure exists.
   * @returns The Attribute object.
   */
  public ensureAttribute(token: AttrToken | string): Attribute {
    return this.ensureChild(ensureToken(token));
  }

  /**
   * Returns all concrete AttrValues defined on this class.
   * Does not take inheritance into account.
   */
  public allAttributeValues(): AttrValue[] {
    let result: AttrValue[] = [];
    for (let attr of this.attributes()) {
      result.push(...attr.values());
    }
    return result;
  }

  public getAttributeValues(token: AttrToken | string, filter?: string): AttrValue[] {
    token = ensureToken(token);
    let attr = this.getAttribute(token);
    if (!attr) { return []; }
    let values = attr.values();
    return filter ? values.filter(s => s.value === filter) : values;
  }

  /**
   * Resolves all AttrValues from this Attribute's inheritance
   * chain. Returns an empty object if no
   * @param token The AttrToken or attribute BlockPath of the Attribute to resolve.
   */
  public resolveAttributeValues(token?: AttrToken | string): Map<string, AttrValue> {
    token = token ? ensureToken(token) : undefined;
    let resolved: Map<string, AttrValue> = new Map();
    let chain = this.resolveInheritance();
    chain.push(this);
    for (let base of chain) {
      let attributes = !token ? base.getAttributes() : [base.getAttribute(token)];
      for (let attr of attributes) {
        if (attr && attr.values()) {
          resolved = new Map([...resolved, ...attr.valuesMap()]);
        }
      }
    }
    return resolved;
  }

  /**
   * AttrValue getter. Returns the AttrValue object in the requested Attribute, without inheritance.
   * @param token `AttrToken` or attribute `BlockPath` string for lookup.
   * @returns The `AttrValue` that was requested, or null.
   */
  public getAttributeValue(token: AttrToken | string): AttrValue | null {
    token = ensureToken(token);
    let attr = this.getAttribute(token);
    return attr ? attr.getValue(token.value) || null : null;
  }

  /**
   * AttrValue getter. Returns the AttrValue object in the requested Attribute, with inheritance.
   * @param token `AttrToken` or attribute `BlockPath` string for lookup.
   * @returns The `AttrValue` that was requested, or null.
   */
  public resolveAttributeValue(token: AttrToken | string): AttrValue | null {
    token = ensureToken(token);
    let value = token.value || ATTR_PRESENT;
    let parent = this.resolveAttribute(token);
    if (parent) { return parent.resolveValue(value); }
    return null;
  }

  /**
   * Ensure that an `AttrValue` within the provided Attribute exists. If the `AttrValue`
   * does not exist, it is created.
   * @param token The AttrValue to ensure exists. This may either be an `AttrToken`,
   * or a string of the format `[namespace|name(="value")]`
   * @returns The AttrValue object.
   */
  public ensureAttributeValue(token: AttrToken | string): AttrValue {
    token = ensureToken(token);
    return this.ensureAttribute(token).ensureValue(token.value);
  }

  /**
   * @returns All AttrValue objects who's value is `ATTR_PRESENT` and are the only values in their attribute.
   */
  public booleanAttributeValues(): AttrValue[] {
    let res: AttrValue[] = [];
    for (let attr of this.getAttributes()) {
      let val = attr.getValue(ATTR_PRESENT);
      if (!attr.hasValues && val) {
        res.push(val);
      }
    }
    return res;
  }

  /**
   * Export as original class name.
   * @param scope  Optional scope to resolve this name relative to. If `true`, return the Block name instead of `:scope`. If a Block object, return with the local name instead of `:scope`.
   * @returns String representing original class.
   */
  public asSource(scope?: Block | boolean): string {
    let blockName = this.block.name;

    if (scope instanceof Block) {
      blockName = scope.getReferencedBlockLocalName(this.block) || blockName;
    }

    if (scope && scope !== this.block) {
      return this.isRoot ? blockName : `${blockName}.${this.name}`;
    }

    return this.isRoot ? ROOT_CLASS : `.${this.name}`;
  }

  /**
   * Emit analysis attributes for the class value this
   * block class represents in it's authored source format.
   *
   * @param optionalRoot The root class is optional on root-level
   *   Attributes. So when these attributes are being used in conjunction
   *   with attributes, this value is set to true.
   */
  public asSourceAttributes(optionalRoot = false): Attr[] {
    if (!this._sourceAttribute) {
      let value: AttributeValue = { constant: this.name };
      if (optionalRoot && this.isRoot) {
        value = attrValues.oneOf([value, attrValues.absent()]);
      }
      this._sourceAttribute = new Attr("class", value);
    }
    return [this._sourceAttribute];
  }

  /**
   * Export as new class name.
   * @param config Option hash configuring output mode.
   * @returns String representing output class.
   */
  public cssClass(config: ResolvedConfiguration, reservedClassNames: Set<string>): string {
    switch (config.outputMode) {
      case OutputMode.BEM:
        let bemName = this.isRoot ? `${this.block.name}` : `${this.block.name}__${this.name}`;
        // if the generated name exists as a reserved classname (generated from
        // blocks aliases), then generate a unique name instead
        if (reservedClassNames.has(bemName)) {
          return this.isRoot ? `${this.block.name}_${this.block.guid}` : `${this.block.name}_${this.block.guid}__${this.name}`;
        } else {
          return bemName;
        }
      case OutputMode.BEM_UNIQUE:
        return this.isRoot ? `${this.block.name}_${this.block.guid}` : `${this.block.name}_${this.block.guid}__${this.name}`;
      default:
        return assertNever(config.outputMode);
    }
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
   * @returns Array of Styles.
   */
  all(shallow?: boolean): Styles[] {
    let result: (AttrValue | BlockClass)[] = [this];
    if (!shallow) {
      result = result.concat(this.allAttributeValues());
    }
    return result;
  }

  getGroupsNames(): Set<string> {
    return new Set<string>([...this._children.keys()]);
  }

  /**
   * Returns the composed styles for this Block Object, and
   * all ancestors in its inheritance tree.
   *
   * @returns The set of Style objects.
   */
  resolveComposedStyles(): Set<Composition> {
    if (this._resolvedComposedStyles) { return this._resolvedComposedStyles; }
    const composedStyles: Set<Composition> = new Set();
    const resolvedStyles = this.resolveStyles();
    for (let style of resolvedStyles) {
      unionInto(composedStyles, style.composedStyles());
    }
    return this._resolvedComposedStyles = composedStyles;
  }

  /**
   * Returns the styles that are composed by this style.
   *
   * @returns The set of Style objects.
   */
  composedStyles(): Set<Composition> {
    return new Set(this._composedStyles);
  }

  /**
   * Adds a new Style for this Style to compose.
   * TODO: Currently, conditions are grouped exclusively by the 'and' operator.
   *       We can abstract boolean operators to keep an internal representation
   *       of logic between css and template files and only resolve them to the
   *       requested language interface at rewrite time.
   */
  addComposedStyle(style: Styles, conditions: AttrValue[]): void {
    this._composedStyles.add({ style, conditions });
  }

  /**
   * Adds a new Style for this Style to compose.
   * TODO: Currently, conditions are grouped exclusively by the 'and' operator.
   *       We can abstract boolean operators to keep an internal representation
   *       of logic between css and template files and only resolve them to the
   *       requested language interface at rewrite time.
   */
  composes(style: Styles, resolve = true): boolean {
    let compositions = resolve ? this.resolveComposedStyles() : new Set(this._composedStyles);
    for (let comp of compositions) {
      if (comp.style === style) { return true; }
    }
    return false;
  }

  /**
   * Debug utility to help test BlockClasses.
   * @param options  Options to pass to BlockClass' asDebug method.
   * @return Array of debug strings for this BlockClass
   */
  debug(config: ResolvedConfiguration): string[] {
    let result: string[] = [];
    const composed = [...this._composedStyles];
    if (composed.length) { result.push(" composes:"); }
    for (let comp of composed) {
      let isLast = composed.indexOf(comp) === composed.length - 1;
      let conditional = comp.conditions.length ? ` when ${comp.conditions.map((c) => c.name()).join(" && ")}` : "";
      result.push(` ${isLast ? "└──"  : "├──"} ${comp.style.asSource(true)}${conditional}`);
    }

    const children = [...this.resolveAttributeValues().values()].map(s => s.asSource());
    children.sort();
    if (children.length) { result.push(" states:"); }
    for (let n of children) {
      let o = this.resolveAttributeValue(n);
      if (!o) { continue; }
      let isLast = children.indexOf(n) === children.length - 1;
      result.push(` ${isLast ? "└──"  : "├──"} ${o.asDebug(config)}`);
    }

    return result;
  }

}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}
