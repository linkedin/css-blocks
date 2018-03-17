import {
  Attr,
  Attribute as AttributeUNS,
  AttributeNS,
  AttributeValueChoice,
  ValueAbsent,
  ValueConstant,
} from "@opticss/element-analysis";
import { assertNever, ObjectDictionary } from "@opticss/util";

import { ATTR_PRESENT, IAttrToken as AttrToken } from "../BlockSyntax";
import { ReadonlyOptions } from "../options";
import { OutputMode } from "../OutputMode";

import { AttrValue } from "./AttrValue";
import { Block } from "./Block";
import { BlockClass } from "./BlockClass";
import { Inheritable } from "./Inheritable";

export class Attribute extends Inheritable<Attribute, Block, BlockClass, AttrValue, AttrToken>
{

  private _hasValues = false;
  private _presenceRule: AttrValue | undefined;
  private _sourceAttributes: Attr[] | undefined;

  protected get ChildConstructor(): typeof AttrValue { return AttrValue; }
  protected tokenToUid(token: AttrToken): string { return `${token.namespace}|${token.name}`; }

  public get name(): string { return this.token.name; }
  public get namespace(): string | null { return this.token.namespace || null; }

  /**
   * @returns If this Attribute contains anything but the "presence" AttrValue.
   **/
  get hasValues(): boolean { return this._hasValues; }

  /**
   * @returns If this Attribute only contains the "presence" AttrValue.
   **/
  get isBooleanAttribute(): boolean { return !this._hasValues; }

  /**
   * @returns The "presence" Value, or `undefined`.
   **/
  get presenceRule(): AttrValue | undefined { return this._presenceRule; }

  /**
   * @returns This Attribute's parent `BlockClass`
   **/
  get blockClass(): BlockClass { return this.parent; }

  /**
   * @returns An array of all `AttrValue`s contained in this `Attribute`.
   **/
  values(): AttrValue[] { return this.children(); }
  resolvedValues(): AttrValue[] { return this.resolveChildren(); }

  /**
   * @returns A hash of all `Value`s contained in this `Attribute`.
   **/
  valuesHash(): ObjectDictionary<AttrValue> { return this.childrenHash(); }
  resolveValuesHash(): ObjectDictionary<AttrValue> { return this.resolveChildrenHash(); }

  /**
   * @returns An Map of all `Value`s contained in this `Attribute`.
   **/
  valuesMap(): Map<string, AttrValue> { return this.childrenMap(); }
  resolveValuesMap(): Map<string, AttrValue> { return this.resolveChildrenMap(); }

  /**
   * Ensures that a AttrValue of name `name` exists in this Attribute. If no
   * `AttrValue` exists, one is created. If no name is passed, it ensures the
   * "presence" AttrValue.
   * @param name  string  The `AttrValue` name to ensure.
   * @returns The `AttrValue`
   **/
  ensureValue(name: string = ATTR_PRESENT) {
    let value = this.ensureChild(name);
    if (name !== ATTR_PRESENT) { this._hasValues = true; }
    else { this._presenceRule = value; }
    return value;
  }

  /**
   * Get am Attribute's own (read: non-inherited) `AttrValue` of name
   * `name` from this `Attribute`. If no name is passed, it tries
   * to retrieve the "presence" AttrValue.
   * @param name  string  The name of the `AttrValue` to retrieve.
   * @returns The `AttrValue` or `undefined`.
   **/
  getValue(name: string = ATTR_PRESENT): AttrValue | null { return this.getChild(name); }

  /**
   * Get am Attribute's own or inherited `AttrValue` of name `name` from this
   * `Attribute` or its base. If no name is passed, it tries to retrieve
   * the "presence" AttrValue.
   * @param name  string  The name of the `AttrValue` to retrieve.
   * @returns The `AttrValue` or `undefined`.
   **/
  resolveValue(name: string = ATTR_PRESENT): AttrValue | null { return this.resolveChild(name); }

  /**
   * @returns whether this Attribute has any Values defined, directly or inherited.
   */
  hasResolvedValues(): boolean {
    return !!(this.hasValues || this.base && this.base.hasResolvedValues());
  }

  /**
   * Resolves all AttrValues from this Attribute's inheritance
   * chain.
   * @returns All AttrValues this Attribute contains.
   */
  resolveValues(): Map<string, AttrValue> {
    let resolved: Map<string, AttrValue> = new Map([...this._children]);
    for (let base of this.resolveInheritance()) {
      if (base._children.size) {
        resolved = new Map([...resolved, ...base._children]);
      }
    }
    return resolved;
  }

  /**
   * @returns The bare Attribute selector with no qualifying `BlockClass` name.
   */
  unqualifiedSource(value?: string): string {
    let namespace = this.token.namespace ? `${this.token.namespace}|` : "";
    value = (value && value !== ATTR_PRESENT) ? `=${value}` : "";
    return `[${namespace}${this.token.name}${value}]`;
  }

  /**
   * Retrieve this Attribute's selector as it appears in the Block source code.
   *
   * @param value If provided, it is used as the Attribute's value whether or not
   *   it is allowed by the known AttrValues (this is useful for constructing
   *   error messages).
   * @returns The Attribute's attribute selector.
   */
  asSource(value?: string): string {
    return (this.blockClass.isRoot ? "" : this.blockClass.asSource()) + this.unqualifiedSource(value);
  }

  /**
   * Emit analysis attributes for the `AttrValue`s this
   * `Attribute` represents in their authored source format.
   */
  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      this._sourceAttributes.push(...this.blockClass.asSourceAttributes());
      let value: AttributeValueChoice | ValueAbsent;
      if (this.hasValues) {
        let values = new Array<ValueConstant>();
        for (let value of this.resolvedValues()) {
          values.push({ constant: value.value });
        }
        value = { oneOf: values };
      } else {
        value = { absent: true };
      }

      if (this.namespace) {
        this._sourceAttributes.push(new AttributeNS(this.namespace, this.name, value));
      }
      else {
        this._sourceAttributes.push(new AttributeUNS(this.name, value));
      }
    }
    return this._sourceAttributes;
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  cssClass(opts: ReadonlyOptions) {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        let cssClassName = this.blockClass.cssClass(opts);
        return `${cssClassName}--${this.token.name}`;
      default:
        return assertNever(opts.outputMode);
    }
  }

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): Attribute[] {
    return [this];
  }
}

/**
 * @param o object  The object to test.
 * @returns If the supplied object `o` is a `Attribute`.
 */
export function isAttribute(o: object): o is Attribute {
  return o instanceof Attribute;
}
