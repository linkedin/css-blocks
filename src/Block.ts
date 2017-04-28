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

export abstract class StateContainer {
  private _states: StateMap = {};

  addState(state: State): void {
    this._states[state.name] = state;
  }

  abstract get stateContainer(): Block | BlockElement | ExclusiveStateGroup;

  ensureState(info: StateInfo) {
    // Could assert that the stateinfo group name matched but yolo.
    if (this._states[info.name]) {
      return this._states[info.name];
    } else {
      let state = new State(info.name, this.stateContainer);
      this.addState(state);
      return state;
    }
  }
}

export abstract class ExclusiveStateGroupContainer extends StateContainer {
  private _exclusiveStateGroups: ExclusiveStateGroupMap = {};

  constructor() {
    super();
  }

  abstract get groupContainer(): Block | BlockElement;

  addExclusiveStateGroup(group: ExclusiveStateGroup): void {
    this._exclusiveStateGroups[group.name] = group;
  }

  ensureState(info: StateInfo): State {
    let state: State;
    if (info.group) {
      let group: ExclusiveStateGroup;
      if (this._exclusiveStateGroups[info.group]) {
        group = this._exclusiveStateGroups[info.group];
      } else {
        group = new ExclusiveStateGroup(info.group, this.groupContainer);
        this.addExclusiveStateGroup(group);
      }
      state = group.ensureState(info);
    } else {
      state = super.ensureState(info);
    }
    return state;
  }
}

export class Block extends ExclusiveStateGroupContainer {
  private _name: string;
  private _elements: BlockElementMap = {};

  constructor(name: string) {
    super();
    this._name = name;
  }

  get groupContainer(): Block | BlockElement {
    return this;
  }

  get stateContainer(): Block | BlockElement | ExclusiveStateGroup {
    return this;
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

  addElement(element: BlockElement) {
    this._elements[element.name] = element;
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
  private _parent: Block | BlockElement;

  constructor(name: string, parent: Block | BlockElement) {
    super();
    this._parent = parent;
    this._name = name;
  }

  get stateContainer(): Block | BlockElement | ExclusiveStateGroup {
    return this;
  }

  get block(): Block {
    if (this._parent instanceof Block) {
      return this._parent;
    } else {
      return this._parent.block;
    }
  }

  get element(): BlockElement | null {
    if (this._parent instanceof BlockElement) {
      return this._parent;
    } else {
      return null;
    }
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
  private _container: Block | BlockElement | ExclusiveStateGroup;
  private _name: string;

  constructor(name: string, container: Block | BlockElement | ExclusiveStateGroup) {
    this._container = container;
    this._name = name;
  }

  get block(): Block {
    if (this._container instanceof Block) {
      return this._container;
    }
    else if (this._container instanceof BlockElement) {
      return this._container.block;
    }
    else {
      return this._container.block;
    }
  }

  get element(): BlockElement | null {
    if (this._container instanceof BlockElement) {
      return this._container;
    }
    else if (this._container instanceof ExclusiveStateGroup) {
      return this._container.element;
    } else {
      return null;
    }
  }

  get group(): ExclusiveStateGroup | null {
    if (this._container instanceof ExclusiveStateGroup) {
      return this._container;
    } else {
      return null;
    }
  }

  get name() {
    return this._name;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        let cssClassName: string;
        if (this.element) {
          cssClassName = this.element.cssClass(opts);
        } else {
          cssClassName = this.block.cssClass(opts);
        }
        if (this.group) {
          return `${cssClassName}--${this.group.name}-${this.name}`;
        } else {
          return `${cssClassName}--${this.name}`;
        }
      default:
        throw "this never happens";
    }
  }
}

export class BlockElement extends ExclusiveStateGroupContainer {
  private _block: Block;
  private _name: string;
  constructor(name: string, block: Block) {
    super();
    this._name = name;
    this._block = block;
  }

  get block() { return this._block; }
  get name()  { return this._name;  }

  get groupContainer(): Block | BlockElement {
    return this;
  }

  get stateContainer(): Block | BlockElement | ExclusiveStateGroup {
    return this;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this.block.name}__${this.name}`;
      default:
        throw "this never happens";
    }
  }
}
