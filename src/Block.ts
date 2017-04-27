import { OptionsReader } from "./options";
import { OutputMode } from "./OutputMode";

interface StateMap {
  [stateName: string]: State;
}

interface ExclusiveStateGroupMap {
  [groupName: string]: ExclusiveStateGroup;
}

export class Block {
  private _name: string;
  private _exclusiveStateGroups: ExclusiveStateGroupMap = {};
  private _states: StateMap = {};

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return this.name;
      default:
        throw "this never happens";
    }
  }

  addState(state: State): void {
    this._states[state.name] = state;
  }

  addExclusiveStateGroup(group: ExclusiveStateGroup): void {
    this._exclusiveStateGroups[group.name] = group;
  }

  ensureState(info: StateInfo): State {
    let state: State;
    let group: ExclusiveStateGroup;
    if (info.group) {
      group = this._exclusiveStateGroups[info.group] || new ExclusiveStateGroup(info.group, this);
      state = new State(info.name, group);
    } else {
      state = this._states[info.name] || new State(info.name, this);
    }
    return state;
  }
}

export class ExclusiveStateGroup {
  private _name: string;
  private _block: Block;
  private _states: StateMap = {};

  constructor(name: string, block: Block) {
    this._block = block;
    this._name = name;
  }

  get block() {
    return this._block;
  }

  get name() {
    return this.name;
  }

  addState(state: State): void {
    this._states[state.name] = state;
  }
}

export interface StateInfo {
  group?: string;
  name: string;
}

export class State {
  private _block: Block;
  private _group: ExclusiveStateGroup | void;
  private _name: string;

  constructor(name: string, blockOrGroup: Block | ExclusiveStateGroup) {
    if (blockOrGroup instanceof Block) {
      this._block = blockOrGroup;
      this._name = name;
      this._block.addState(this);
    } else {
      this._group = blockOrGroup;
      this._block = blockOrGroup.block;
      this._name = name;
      this._group.addState(this);
    }
  }

  get block() {
    return this._block;
  }

  get group() {
    return this._group;
  }

  get name() {
    return this._name;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this.block.cssClass(opts)}--${this.name}`;
      default:
        throw "this never happens";
    }
  }

}
