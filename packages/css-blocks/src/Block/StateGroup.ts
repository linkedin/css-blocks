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

  protected newChild(name: string): State { return new State(name, this); }

  /**
   * @returns If this State Group contains anything but the "Universal" State.
   **/
  get hasSubStates(): boolean { return this._hasSubStates; }

  /**
   * @returns If this State Group only contains the "Universal" State.
   **/
  get isBooleanState(): boolean { return !this._hasSubStates; }

  /**
   * @returns The "Universal" State, or `undefined`.
   **/
  get universalState(): State | undefined { return this._universalState; }

  /**
   * @returns This State's parent `BlockClass`
   **/
  get blockClass(): BlockClass { return this.parent; }

  /**
   * @returns An array of all `State`s contained in this `StateGroup`.
   **/
  states(): State[] { return this.children(); }

  /**
   * @returns A hash of all `State`s contained in this `StateGroup`.
   **/
  statesHash(): ObjectDictionary<State> { return this.childrenHash(); }

  /**
   * @returns An Map of all `State`s contained in this `StateGroup`.
   **/
  statesMap(): Map<string, State> { return this.childrenMap(); }

  /**
   * Ensures that a state of name `name` exists in this State group. If no
   * `State` exists, one is created. If no name is passed, it ensures the
   * "Universal" State.
   * @param name  string  The `State` name to ensure.
   * @returns The `State`
   **/
  ensureState(name: string = UNIVERSAL_STATE) {
    let state = this.ensureChild(name);
    if (name !== UNIVERSAL_STATE) { this._hasSubStates = true; }
    else { this._universalState = state; }
    return state;
  }

  /**
   * Get a StateGroup's own (read: non-inherited) `State` of name
   * `name` from this `StateGroup`. If no name is passed, it tries
   * to retrieve the "Universal" State.
   * @param name  string  The name of the `State` to retrieve.
   * @returns The `State` or `undefined`.
   **/
  getState(name: string = UNIVERSAL_STATE): State | null { return this.getChild(name); }

  /**
   * Get a StateGroup's own or inherited`State` of name `name` from this
   * `StateGroup` or its base. If no name is passed, it tries to retrieve
   * the "Universal" State.
   * @param name  string  The name of the `State` to retrieve.
   * @returns The `State` or `undefined`.
   **/
  resolveState(name: string = UNIVERSAL_STATE): State | null { return this.resolveChild(name); }

  /**
   * @returns whether this state has any sub states defined directly or inherited.
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

  /**
   * @returns The bare state selector with no qualifying `BlockClass` name.
   */
  unqualifiedSource(value?: string): string {
    return `[state|${this.name}${(value && value !== UNIVERSAL_STATE) ? `=${value}` : ""}]`;
  }

  /**
   * Retrieve this State's selector as it appears in the Block source code.
   *
   * @param value If provided, it is used as the state's value whether or not
   *   it is allowed by the known states (this is useful for constructing
   *   error messages).
   * @returns The State's attribute selector.
   */
  asSource(value?: string): string {
    return (this.blockClass.isRoot ? "" : this.blockClass.asSource()) + this.unqualifiedSource(value);
  }

  /**
   * Emit analysis attributes for the `State` values this
   * `StateGroup` represents in it's authored source format.
   */
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

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): StateGroup[] {
    return [this];
  }
}

/**
 * @param o object  The object to test.
 * @returns If the supplied object `o` is a `StateGroup`.
 */
export function isStateGroup(o: object): o is StateGroup {
  return o instanceof StateGroup;
}
