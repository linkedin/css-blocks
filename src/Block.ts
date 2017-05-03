import { OptionsReader } from "./options";
import { OutputMode } from "./OutputMode";
import { CssBlockError } from "./errors";

interface StateMap {
  [stateName: string]: State;
}

interface ExclusiveStateGroupMap {
  [groupName: string]: ExclusiveStateGroup;
}

interface BlockElementMap {
  [elementName: string]: BlockElement;
}

interface BlockReferenceMap {
  [blockName: string]: Block;
}

export interface Export {
  identifier: string;
  value: string;
}

export type BlockObject = Block | BlockElement | State;

export interface MergedObjectMap {
  [sourceName: string]: BlockObject[];
}

export interface HasBlockObjects {
  all(): BlockObject[];
}

export interface Exportable {
  localName(): string;
  cssClass(opts: OptionsReader): string;
  asExport(opts: OptionsReader): Export;
}

export abstract class StateContainer implements HasBlockObjects {
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

  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    this.states.forEach((state) => {
      result.push(state.asDebug(opts));
    });
    return result;
  }

  all(): BlockObject[] {
    return this.states;
  }
}

export abstract class ExclusiveStateGroupContainer extends StateContainer implements HasBlockObjects {
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

  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    this.groups.forEach((group) => {
      result = result.concat(group.debug(opts));
    });
    result = result.concat(super.debug(opts));
    return result;
  }

  all(): BlockObject[] {
    let result: BlockObject[] = [];
    this.groups.forEach((group) => {
      result = result.concat(group.all());
    });
    result = result.concat(super.all());
    return result;
  }
}

export class Block extends ExclusiveStateGroupContainer implements Exportable, HasBlockObjects {
  private _name: string;
  private _elements: BlockElementMap = {};
  private _blockReferences: BlockReferenceMap = {};
  private _source: string;
  private _base: Block;
  private _implements: Block[] = [];

  constructor(name: string, source: string) {
    super();
    this._name = name;
    this._source = source;
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

  get base(): Block {
    return this._base;
  }

  set base(base: Block) {
    this._base = base;
  }

  get implementsBlocks(): Block[] {
    return this._implements.concat([]);
  }

  addImplementation(b: Block) {
    return this._implements.push(b);
  }

  // @returns the objects from b that are missing in thie block.
  checkImplementation(b: Block): BlockObject[] {
    let missing: BlockObject[] = [];
    b.all().forEach((o: BlockObject) => {
      if (!this.find(o.asSource())) {
        missing.push(o);
      }
    });
    return missing;
  }

  checkImplementations(): void {
    this.implementsBlocks.forEach((b: Block) => {
      let missingObjs: BlockObject[] = this.checkImplementation(b);
      let missingObjsStr = missingObjs.map(o => o.asSource()).join(", ");
      if (missingObjs.length > 0) {
        let s = missingObjs.length > 1 ? 's' : '';
        throw new CssBlockError(
          `Missing implementation${s} for: ${missingObjsStr} from ${b.source}`);
      }
    });
  }

  // This is a really dumb impl
  find(sourceName): BlockObject | undefined {
    return this.all().find(e => e.asSource() === sourceName);
  }

  get source() {
    return this._source;
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

  addBlockReference(localName: string, other: Block) {
    this._blockReferences[localName] = other;
  }

  getReferencedBlock(localName: string): Block | null {
    return this._blockReferences[localName] || null;
  }

  all(shallow?: boolean): BlockObject[] {
    let result: BlockObject[] = [this];
    result = result.concat(super.all());
    this.elements.forEach((element) => {
      result.push(element);
      result = result.concat(element.all());
    });
    if (!shallow && this.base) {
      result = result.concat(this.base.all(shallow));
    }
    return result;
  }

  merged(): MergedObjectMap {
    let map: MergedObjectMap = {};
    this.all().forEach((obj: BlockObject) => {
      let sourceName = obj.asSource();
      if (!map[sourceName]) {
        map[sourceName] = [];
      }
      map[sourceName].push(obj);
    });
    return map;
  }

  asSource():string {
    return `:block`;
  }

  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => .${this.cssClass(opts)}`;
  }

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.source}`, this.asDebug(opts)];
    result = result.concat(super.debug(opts));
    this.elements.forEach((element) => {
      result.push(element.asDebug(opts));
      result = result.concat(element.debug(opts));
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

  asSource(): string {
    let source: string;
    if (this.element) {
      source = this.element.asSource() + ":substate(";
    } else {
      source = ":state(";
    }
    if (this.group) {
      source = source + `${this.group.name} `;
    }
    source = source + this.name + ")";
    return source;
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

  asDebug(opts: OptionsReader): string {
    return `${this.asSource()} => .${this.cssClass(opts)}`;
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

  asSource(): string {
    return `.${this.name}`;
  }

  asDebug(opts: OptionsReader): string {
    return `${this.asSource()} => .${this.cssClass(opts)}`;
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
