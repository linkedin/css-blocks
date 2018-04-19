import {
  Attr,
  Attribute as AttributeUNS,
  AttributeNS,
  attrValues,
} from "@opticss/element-analysis";
import { assertNever, assertNeverCalled } from "@opticss/util";

import { ATTR_PRESENT } from "../BlockSyntax";
import { OutputMode,
 ResolvedConfiguration } from "../configuration";

import { Attribute } from "./Attribute";
import { Block } from "./Block";
import { BlockClass } from "./BlockClass";
import { RulesetContainer } from "./RulesetContainer";
import { Style } from "./Style";

/**
 * AttrValue represents the value of an Attribute in a particular Block.
 * An Attribute can have many AttrValue children that are considered to
 * be mutually exclusive. Attributes can be designated as "global";
 */
export class AttrValue extends Style<AttrValue, Block, Attribute, never> {
  isGlobal = false;

  private _sourceAttributes: Attr[] | undefined;
  public readonly rulesets: RulesetContainer<AttrValue>;

  /**
   * AttrValue constructor. Provide a local name for this AttrValue, and the parent container.
   * @param name The local name for this AttrValue.
   * @param parent The parent Attribute of this AttrValue.
   */
  constructor(name: string, parent: Attribute) {
    super(name, parent);
    this.rulesets = new RulesetContainer(this);
  }

  protected get ChildConstructor(): never { return assertNeverCalled(); }
  newChild(): never { return assertNeverCalled(); }

  /** @returns The string value this AttrValue represents. */
  get value(): string { return this.uid; }

  /** @returns If this is the presence state. */
  get isPresenceRule(): boolean { return this.value === ATTR_PRESENT; }

  /**
   * Retrieve the Attribute that this AttrValue belongs to.
   * @returns The parent Attribute, or null.
   */
  get attribute(): Attribute { return this.parent; }

  /**
   * Retrieve the BlockClass that this AttrValue belongs to.
   * @returns The parent BlockClass, or null.
   */
  get blockClass(): BlockClass { return this.parent.blockClass; }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      let blockClass = this.blockClass;
      let rootIsOptional = true;
      this._sourceAttributes = blockClass.asSourceAttributes(rootIsOptional);
      let value = this.isPresenceRule ? attrValues.absent() : attrValues.constant(this.value);
      if (this.parent.namespace) {
        this._sourceAttributes.push(new AttributeNS(this.parent.namespace, this.parent.name, value));
      }
      else {
        this._sourceAttributes.push(new AttributeUNS(this.parent.name, value));
      }
    }
    return this._sourceAttributes.slice();
  }

  /**
   * Export as original AttrValue name.
   * @param scope  Optional scope to resolve this name relative to. If `true`, return the Block name instead of `:scope`. If a Block object, return with the local name instead of `:scope`.
   * @returns String representing original AttrValue path.
   */
  asSource(scope?: Block | boolean): string {
    let namespace = this.attribute.namespace ? `${this.attribute.namespace}|` : "";
    let value = (this.value && this.value !== ATTR_PRESENT) ? `=${this.value}` : "";
    return this.attribute.blockClass.asSource(scope) + `[${namespace}${this.parent.name}${value}]`;
  }

  public cssClass(config: ResolvedConfiguration): string {
    switch (config.outputMode) {
      case OutputMode.BEM:
        return `${this.parent.cssClass(config)}${ this.isPresenceRule ? "" : `-${this.value}`}`;
      default:
        return assertNever(config.outputMode);
    }
  }

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): AttrValue[] {
    return [this];
  }
}

export function isAttrValue(o: object): o is AttrValue {
  return o instanceof AttrValue;
}
