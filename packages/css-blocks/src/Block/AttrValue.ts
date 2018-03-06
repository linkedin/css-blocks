import {
  Attr,
  AttributeNS,
  attrValues,
} from "@opticss/element-analysis";
import { assertNever, assertNeverCalled } from "@opticss/util";

import { UNIVERSAL_ATTR_VALUE } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { Attribute } from "./Attribute";
import { Block } from "./Block";
import { BlockClass } from "./BlockClass";
import { RulesetContainer } from "./RulesetContainer";
import { Style } from "./Style";

/**
 * AttrValue represent the value of an Attribute in a particular Block.
 * An Attribute can have AttrValue that are considered to be mutually exclusive.
 * Attributes can be designated as "global";
 */
export class AttrValue extends Style<AttrValue, Block, Attribute, never> {
  isGlobal = false;

  private _sourceAttributes: AttributeNS[] | undefined;
  public readonly rulesets: RulesetContainer<AttrValue>;

  /**
   * AttrValue constructor. Provide a local name for this AttrValue, an optional group name,
   * and the parent container.
   * @param name The local name for this state.
   * @param group An optional parent group name.
   * @param parent The parent Attribute of this AttrValue.
   */
  constructor(name: string, parent: Attribute) {
    super(name, parent);
    this.rulesets = new RulesetContainer(this);
  }

  protected get ChildConstructor(): never { return assertNeverCalled(); }
  newChild(): never { return assertNeverCalled(); }

  get isUniversal(): boolean { return this.uid === UNIVERSAL_ATTR_VALUE; }

  /**
   * Retrieve the BlockClass that this state belongs to.
   * @returns The parent block class, or null.
   */
  get blockClass(): BlockClass { return this.parent.parent; }

  /**
   * Retrieve this AttrValue's local name, including the optional BlockClass and group designations.
   * @returns The AttrValue's local name.
   */
  localName(): string {
    return `${this.parent.localName()}${this.isUniversal ? "" : `-${this.uid}`}`;
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      let blockClass = this.blockClass;
      let rootIsOptional = true;
      this._sourceAttributes = blockClass.asSourceAttributes(rootIsOptional);
      let value = this.isUniversal ? attrValues.absent() : attrValues.constant(this.uid);
      this._sourceAttributes.push(new AttributeNS(this.parent.namespace, this.parent.name, value));
    }
    return this._sourceAttributes.slice();
  }

  asSource(): string {
    return this.parent.asSource(this.uid);
  }

  public cssClass(opts: OptionsReader): string {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        return `${this.parent.cssClass(opts)}${ this.isUniversal ? "" : `-${this.uid}`}`;
      default:
        return assertNever(opts.outputMode);
    }
  }

  // TODO: Implement lookup relative to AttrValue.
  public lookup(): undefined { return undefined; }

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
