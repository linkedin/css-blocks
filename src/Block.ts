import { OptionsReader } from "./options";
import { OutputMode } from "./OutputMode";

interface StateMap {
  [stateName: string]: State;
}

interface ExclusiveStateGroupMap {
  [groupName: string]: ExclusiveStateGroup;
}

interface BlockElementMap {
  [elementName: string]: BlockElement;
}

export class StateContainer {
  private _states: StateMap = {};

  addState(state: State): void {
    this._states[state.name] = state;
  }

  ensureState(info: StateInfo) {
    // Could assert that the stateinfo group name matched but yolo.
    if (this._states[info.name]) {
      return this._states[info.name];
    } else {
      let state = new State(info.name, this);
      this.addState(state);
      return state;
    }
  }
}

export class Block extends StateContainer {
  private _name: string;
  private _exclusiveStateGroups: ExclusiveStateGroupMap = {};
  private _elements: BlockElementMap = {};

  constructor(name: string) {
    super();
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

  addExclusiveStateGroup(group: ExclusiveStateGroup): void {
    this._exclusiveStateGroups[group.name] = group;
  }

  addElement(element: BlockElement) {
    this._elements[element.name] = element;
  }

  ensureState(info: StateInfo): State {
    let state: State;
    if (info.group) {
      let group: ExclusiveStateGroup;
      if (this._exclusiveStateGroups[info.group]) {
        group = this._exclusiveStateGroups[info.group];
      } else {
        group = new ExclusiveStateGroup(info.group, this);
        this.addExclusiveStateGroup(group);
      }
      state = group.ensureState(info);
    } else {
      state = super.ensureState(info);
    }
    return state;
  }

  ensureElement(name: string): BlockElement {
    let element;
    if (this._elements[name]) {
      element = this._elements[name];
    } else {
      element = new BlockElement(name, this);
      this.addElement(element);
    }
    return element;
  }
}

export class ExclusiveStateGroup extends StateContainer {
  private _name: string;
  private _block: Block;

  constructor(name: string, block: Block) {
    super();
    this._block = block;
    this._name = name;
  }

  get block() {
    return this._block;
  }

  get name() {
    return this._name;
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

  constructor(name: string, container: StateContainer) {
    if (container instanceof Block) {
      this._block = container;
      this._name = name;
    } else if (container instanceof ExclusiveStateGroup) {
      this._group = container;
      this._block = container.block;
      this._name = name;
    } else {
      throw "what is ${container}";
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
        if (this.group) {
          return `${this.block.cssClass(opts)}--${this.group.name}-${this.name}`;
        } else {
          return `${this.block.cssClass(opts)}--${this.name}`;
        }
      default:
        throw "this never happens";
    }
  }
}

export class BlockElement {
  private _block: Block;
  private _name: string;
  constructor(name: string, block: Block) {
    this._name = name;
    this._block = block;
  }

  get block() { return this._block; }
  get name()  { return this._name;  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this.block.name}__${this.name}`;
      default:
        throw "this never happens";
    }
  }
}
