import { Attribute as Attr, AttributeValue, attrValues } from "@opticss/element-analysis";
import { MultiMap } from "@opticss/util";
import { isString } from "util";

import { IAttrToken as AttrToken, ROOT_CLASS, UNIVERSAL_ATTR_VALUE } from "../BlockSyntax";
import { BlockPath } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { AttrValue } from "./AttrValue";
import { Attribute } from "./Attribute";
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

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends Style<BlockClass, Block, Block, Attribute> {
  private _sourceAttribute: Attr | undefined;
  public readonly rulesets: RulesetContainer<BlockClass>;
  private namespaces: MultiMap<string, Attribute> = new MultiMap();
  private attrsByName: MultiMap<string, Attribute> = new MultiMap();

  constructor(name: string, parent: Block) {
    super(name, parent);
    this.rulesets = new RulesetContainer(this);
  }

  protected get ChildConstructor(): typeof Attribute { return Attribute; }

  protected newChild(token: AttrToken): Attribute {
    let res = super.newChild(token);
    this.namespaces.set(res.namespace, res);
    this.attrsByName.set(res.uid, res);
    return res;
  }

  get isRoot(): boolean { return this.uid === ROOT_CLASS; }

  public getNamespace(namespace: string): Attribute[] { return this.namespaces.get(namespace); }

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
  allValues(): AttrValue[] {
    let result: AttrValue[] = [];
    for (let attr of this.attributes()) {
      result.push(...attr.values());
    }
    return result;
  }

  public getValues(token: AttrToken | string, filter?: string): AttrValue[] {
    token = ensureToken(token);
    let attr = this.getAttribute(token);
    if (!attr) { return []; }
    let values = attr.values();
    return filter ? values.filter(s => s.uid === filter) : values;
  }

  /**
   * Resolves all AttrValues from this Attribute's inheritance
   * chain. Returns an empty object if no
   * @param token The AttrToken or attribute BlockPath of the Attribute to resolve.
   */
  resolveValues(token?: AttrToken | string): Map<string, AttrValue> {
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
  public getValue(token: AttrToken | string): AttrValue | null {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    let attr = this.getAttribute(token);
    return attr ? attr.getValue(value) || null : null;
  }

  /**
   * AttrValue getter. Returns the AttrValue object in the requested Attribute, with inheritance.
   * @param token `AttrToken` or attribute `BlockPath` string for lookup.
   * @returns The `AttrValue` that was requested, or null.
   */
  public resolveValue(token: AttrToken | string): AttrValue | null {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    let parent = this.resolveAttribute(token);
    if (parent) { return parent.resolveValue(value); }
    return null;
  }

  /**
   * Ensure that an `AttrValue` within the provided Attribute exists. If the `AttrValue`
   * does not exist, it is created.
   * @param name The Attribute to ensure exists.
   * @param value The AttrValue's value to ensure exists.
   * @returns The AttrValue object.
   */
  public ensureValue(token: AttrToken | string): AttrValue {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    return this.ensureAttribute(token).ensureValue(value);
  }

  public booleanValues(): AttrValue[] {
    let res: AttrValue[] = [];
    for (let attr of this.getAttributes()) {
      let val = attr.getValue(UNIVERSAL_ATTR_VALUE);
      if (!attr.hasValues && val) {
        res.push(val);
      }
    }
    return res;
  }

  public localName(): string { return this.uid; }

  /**
   * Export as original class name.
   * @returns String representing original class.
   */
  public asSource(): string { return this.isRoot ? ROOT_CLASS : `.${this.uid}`; }

  /**
   * Emit analysis attributes for the class value this
   * block class represents in it's authored source format.
   *
   * @param optionalRoot The root class is optional on root-level
   *   Attributes. So when these attributes are being used in conjunction
   *   with a Attributes, this value is set to true.
   */
  public asSourceAttributes(optionalRoot = false): Attr[] {
    if (!this._sourceAttribute) {
      let value: AttributeValue = { constant: this.uid };
      if (optionalRoot && this.isRoot) {
        value = attrValues.oneOf([value, attrValues.absent()]);
      }
      this._sourceAttribute = new Attr("class", value);
    }
    return [this._sourceAttribute];
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  public cssClass(opts: OptionsReader): string {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        if (this.isRoot) {
          return `${this.block.uid}`;
        } else {
          return `${this.block.uid}__${this.uid}`;
        }
      default:
        throw new Error("this never happens");
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
      result = result.concat(this.allValues());
    }
    return result;
  }

  getGroupsNames(): Set<string> {
    return new Set<string>([...this._children.keys()]);
  }

  /**
   * Debug utility to help test BlockClasses.
   * @param options  Options to pass to BlockClass' asDebug method.
   * @return Array of debug strings for this BlockClass
   */
  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    for (let style of this.all()) {
      result.push(style.asDebug(opts));
    }
    return result;
  }

}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}
