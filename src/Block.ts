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

export interface Export {
  identifier: string;
  value: string;
}

export interface HasExports {
  exports(opts: OptionsReader): Export[];
}

export interface Exportable {
  localName(): string;
  asExport(opts: OptionsReader): Export;
}

export abstract class StateContainer implements HasExports {
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

  get states(): State[] {
    let states: State[] = [];
    Object.keys(this._states).forEach((s) => {
      states.push(this._states[s]);
    });
    return states;
  }

  exports(opts: OptionsReader): Export[] {
    let result: Export[] = [];
    this.states.forEach((state) => {
      result.push(state.asExport(opts));
    });
    return result;
  }
}

export abstract class ExclusiveStateGroupContainer extends StateContainer implements HasExports {
  private _exclusiveStateGroups: ExclusiveStateGroupMap = {};

  constructor() {
    super();
  }

  abstract get groupContainer(): Block | BlockElement;

  addExclusiveStateGroup(group: ExclusiveStateGroup): void {
    this._exclusiveStateGroups[group.name] = group;
  }

  get groups(): ExclusiveStateGroup[] {
    let groups: ExclusiveStateGroup[] = [];
    Object.keys(this._exclusiveStateGroups).forEach((g) => {
      groups.push(this._exclusiveStateGroups[g]);
    });
    return groups;
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

  exports(opts: OptionsReader): Export[] {
    let result: Export[] = [];
    this.groups.forEach((group) => {
      result = result.concat(group.exports(opts));
    });
    result = result.concat(super.exports(opts));
    return result;
  }
}

export class Block extends ExclusiveStateGroupContainer implements Exportable, HasExports {
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

  get elements(): BlockElement[] {
    let elements: BlockElement[] = [];
    Object.keys(this._elements).forEach((e) => {
      elements.push(this._elements[e]);
    });
    return elements;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return this.name;
      default:
        throw "this never happens";
    }
  }

  localName(): string {
    return "block";
  }

  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
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

  exports(opts: OptionsReader): Export[] {
    let result: Export[] = [this.asExport(opts)];
    result = result.concat(super.exports(opts));
    this.elements.forEach((element) => {
      result.push(element.asExport(opts));
      result = result.concat(element.exports(opts));
    });
    return result;
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

export class State implements Exportable {
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

  localName(): string {
    let localNames: string[] = [];
    if (this.element) {
      localNames.push(this.element.localName());
    }
    if (this.group) {
      localNames.push(`${this.group.name}-${this.name}`);
    } else {
      localNames.push(this.name);
    }
    return localNames.join("--");
  }

  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
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

export class BlockElement extends ExclusiveStateGroupContainer implements Exportable {
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

  localName(): string {
    return this.name;
  }

  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
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
