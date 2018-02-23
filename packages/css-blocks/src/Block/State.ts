import { assertNever } from "@opticss/util";
import { SinkStyle } from "./BlockTree";
import { BlockClass } from "./BlockClass";
import { StateGroup } from "./StateGroup";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";
import { UNIVERSAL_STATE } from "../BlockSyntax";
import { Block } from "./Block";
import {
  Attr,
  AttributeNS
} from "@opticss/element-analysis";

/**
 * States represent a state attribute selector in a particular Block.
 * A State can have sub-states that are considered to be mutually exclusive.
 * States can be designated as "global";
 */
export class State extends SinkStyle<State, Block, StateGroup> {
  isGlobal = false;

  private _sourceAttributes: AttributeNS[];

  /**
   * State constructor. Provide a local name for this State, an optional group name,
   * and the parent container.
   * @param name The local name for this state.
   * @param group An optional parent group name.
   * @param container The parent container of this State.
   */
  constructor(name: string, parent: StateGroup, root: Block) {
    super(name, parent, root);
  }

  protected newChild(): null { return null; }

  get isUniversal(): boolean { return this.name === UNIVERSAL_STATE; }

  /**
   * Retrieve the BlockClass that this state belongs to.
   * @returns The parent block class, or null.
   */
  get blockClass(): BlockClass { return this.parent.parent; }

  /**
   * Retrieve this State's local name, including the optional BlockClass and group designations.
   * @returns The State's local name.
   */
  localName(): string {
    return `${this.parent.localName()}${this.isUniversal ? '' : `-${this.name}`}`;
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      this._sourceAttributes.push(new AttributeNS("state", this.parent.name, { constant: this.name }));
    }
    return this._sourceAttributes.slice();
  }

  asSource(): string {
    let attr = this.isUniversal ? `[state|${this.parent.name}]` : `[state|${this.parent.name}=${this.name}]`;
    let blockClass = this.blockClass;
    if (!blockClass.isRoot) {
      return `${blockClass.asSource()}${attr}`;
    } else {
      return attr;
    }
  }

  public cssClass(opts: OptionsReader): string {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        return `${this.parent.cssClass(opts)}${ this.isUniversal ? '' : `-${this.name}`}`;
      default:
        return assertNever(opts.outputMode);
    }
  }

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): State[] {
    return [this];
  }
}

export function isState(o: object): o is State {
  return o instanceof State;
}
