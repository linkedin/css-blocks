import {
  Attr,
  AttributeNS,
  AttributeValueChoice,
  ValueAbsent,
  ValueConstant,
} from "@opticss/element-analysis";
import { ObjectDictionary } from "@opticss/util";

import { UNIVERSAL_STATE } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { Block } from "./Block";
import { BlockClass } from "./BlockClass";
import { Inheritable } from "./Inheritable";
import { State } from "./State";

export class StateGroup extends Inheritable<StateGroup, Block, BlockClass, State>
{

  private _hasSubStates = false;
  private _universalState: State | undefined;
  private _sourceAttributes: Attr[] | undefined;

  constructor(name: string, parent: BlockClass) {
    super(name, parent);
  }

  protected newChild(name: string): State { return new State(name, this); }

  get hasSubStates(): boolean { return this._hasSubStates; }
  get universalState(): State | undefined { return this._universalState; }
  get blockClass(): BlockClass { return this.parent; }

  states(): State[] { return this.children(); }
  statesHash(): ObjectDictionary<State> { return this.childrenHash(); }
  statesMap(): Map<string, State> { return this.childrenMap(); }
  ensureState(name?: string) {
    name = name || UNIVERSAL_STATE;
    let state = this.ensureChild(name);
    if (name !== UNIVERSAL_STATE) { this._hasSubStates = true; }
    else { this._universalState = state; }
    return state;
  }
  getState(name: string): State | null { return name ? this.getChild(name) : this.getChild(UNIVERSAL_STATE); }
  resolveState(name: string): State | null { return name ? this.resolveChild(name) : this.resolveChild(UNIVERSAL_STATE); }

  /**
   * returns whether this state has any sub states defined directly
   * or inherited.
   */
  hasResolvedStates(): boolean {
    return !!(this.hasSubStates || this.base && this.base.hasResolvedStates());
  }

  /**
   * Resolves all sub-states from this state's inheritance
   * chain. Returns an empty object if no
   * @param stateName The name of the sub-state to resolve.
   */
  resolveStates(): Map<string, State> {
    let resolved: Map<string, State> = new Map();
    for (let base of this.resolveInheritance()) {
      if (base.states()) {
        resolved = new Map([...resolved, ...base._children]);
      }
    }
    Object.assign(resolved, this._children);
    return resolved;
  }

  unqualifiedSource(value?: string): string {
    return `[state|${this.name}${(value && value !== UNIVERSAL_STATE) ? `=${value}` : ""}]`;
  }

  /**
   * Retrieve this State's selector as it appears in the Block source code.
   * If a value is provided,
   * @returns The State's attribute selector
   */
  asSource(value?: string): string {
    return (this.blockClass.isRoot ? "" : this.blockClass.asSource()) + this.unqualifiedSource(value);
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      this._sourceAttributes.push(...this.blockClass.asSourceAttributes());
      let value: AttributeValueChoice | ValueAbsent;
      if (this.hasSubStates) {
        let values = new Array<ValueConstant>();
        for (let state of this.states()) {
          values.push({ constant: state.name });
        }
        value = { oneOf: values };
      } else {
        value = { absent: true };
      }
      this._sourceAttributes.push(new AttributeNS("state", this.name, value));
    }
    return this._sourceAttributes;
  }

  /**
   * Retrieve this State's local name, including the optional BlockClass and group designations.
   * @returns The State's local name.
   */
  localName(): string {
    if (this.blockClass.isRoot) {
      return this.name;
    } else {
      return `${this.blockClass.localName()}--${this.name}`;
    }
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  cssClass(opts: OptionsReader) {
    switch (opts.outputMode) {
      case OutputMode.BEM:
        let cssClassName = this.blockClass.cssClass(opts);
        return `${cssClassName}--${this.name}`;
      default:
        throw new Error("this never happens");
    }
  }

  // TODO: Implement lookup relative to State.
  public lookup(): undefined { return undefined; }

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): StateGroup[] {
    return [this];
  }
}

export function isStateGroup(o: object): o is StateGroup {
  return o instanceof StateGroup;
}
