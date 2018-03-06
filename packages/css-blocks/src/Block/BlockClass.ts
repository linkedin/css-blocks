import { Attribute as Attr, AttributeValue, attrValues } from "@opticss/element-analysis";
import { MultiMap } from "@opticss/util";
import { isString } from "util";

import { ROOT_CLASS, UNIVERSAL_ATTR_VALUE } from "../BlockSyntax";
import { BlockPath } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { AttrValue } from "./AttrValue";
import { Attribute, AttrToken } from "./Attribute";
import { Block } from "./Block";
import { RulesetContainer } from "./RulesetContainer";
import { Style } from "./Style";
import { Styles } from "./Styles";

/**
 * Holds state values to be passed to the StateContainer.
 */
export interface AttrInfo {
  group?: string;
  name: string;
}

export interface AttrValueToken extends AttrToken {
  value?: string;
}

function ensureToken(input: AttrValueToken | string): AttrValueToken {
  let token: AttrValueToken | string | undefined = input;
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
   * Returns all concrete states defined against this class.
   * Does not take inheritance into account.
   */
  allValues(): AttrValue[] {
    let result: AttrValue[] = [];
    for (let stateContainer of this.attributes()) {
      result.push(...stateContainer.values());
    }
    return result;
  }

  public getValues(token: AttrToken | string, filter?: string): AttrValue[] {
    token = ensureToken(token);
    let group = this.getAttribute(token);
    if (!group) { return []; }
    let values = group.values();
    return filter ? values.filter(s => s.uid === filter) : values;
  }

  /**
   * Resolves all sub-states from this state's inheritance
   * chain. Returns an empty object if no
   * @param stateName The name of the sub-state to resolve.
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
   * AttrValue getter. Returns the AttrValue object in the requested Attribute group. This does
   * not take inheritance into account.
   * @param groupName Attribute name for lookup.
   * @param valueName Optional Value name to filter AttrValues by.
   * @returns An array of all States that were requested.
   */
  public getValue(token: AttrValueToken | string): AttrValue | null {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    let group = this.getAttribute(token);
    return group ? group.getValue(value) || null : null;
  }

  public resolveValue(token: AttrValueToken | string): AttrValue | null {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    let parent = this.resolveAttribute(token);
    if (parent) { return parent.resolveValue(value); }
    return null;
  }

  /**
   * Ensure that an `AttrValue` within the provided group exists. If the `State`
   * does not exist, it is created.
   * @param name The Attribute to ensure exists.
   * @param value The AttrValue's value to ensure exists.
   * @returns The State object.
   */
  public ensureValue(token: AttrValueToken | string): AttrValue {
    token = ensureToken(token);
    let value = token.value || UNIVERSAL_ATTR_VALUE;
    return this.ensureAttribute(token).ensureValue(value);
  }

  public booleanValues(): AttrValue[] {
    let res: AttrValue[] = [];
    for (let group of this.getAttributes()) {
      let state = group.getValue(UNIVERSAL_ATTR_VALUE);
      if (!group.hasValues && state) {
        res.push(state);
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
   *   states. So when these attributes are being used in conjunction
   *   with a state, this value is set to true.
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
   * Debug utility to help test States.
   * @param options  Options to pass to States' asDebug method.
   * @return Array of debug strings for these states
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
