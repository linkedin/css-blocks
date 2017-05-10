import { OptionsReader } from "./options";
import { OutputMode } from "./OutputMode";
import { CssBlockError } from "./errors";
import { SelectorNode } from "./parseSelector";

interface StateMap {
  [stateName: string]: State;
}

interface ExclusiveStateGroupMap {
  [groupName: string]: ExclusiveStateGroup;
}

interface BlockClassMap {
  [className: string]: BlockClass;
}

interface BlockReferenceMap {
  [blockName: string]: Block;
}

export interface Export {
  identifier: string;
  value: string;
}

export type BlockObject = Block | BlockClass | State;

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

  abstract get stateContainer(): Block | BlockClass | ExclusiveStateGroup;

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

  abstract get groupContainer(): Block | BlockClass;

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
  private _classes: BlockClassMap = {};
  private _blockReferences: BlockReferenceMap = {};
  private _source: string;
  private _base: Block;
  private _implements: Block[] = [];

  constructor(name: string, source: string) {
    super();
    this._name = name;
    this._source = source;
  }

  get groupContainer(): Block | BlockClass {
    return this;
  }

  get stateContainer(): Block | BlockClass | ExclusiveStateGroup {
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

  get classes(): BlockClass[] {
    let classes: BlockClass[] = [];
    Object.keys(this._classes).forEach((e) => {
      classes.push(this._classes[e]);
    });
    return classes;
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

  addClass(blockClass: BlockClass) {
    this._classes[blockClass.name] = blockClass;
  }

  ensureClass(name: string): BlockClass {
    let blockClass;
    if (this._classes[name]) {
      blockClass = this._classes[name];
    } else {
      blockClass = new BlockClass(name, this);
      this.addClass(blockClass);
    }
    return blockClass;
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
    this.classes.forEach((blockClass) => {
      result.push(blockClass);
      result = result.concat(blockClass.all());
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

  matches(compoundSel: SelectorNode[]): boolean {
    let srcVal = this.asSource();
    return compoundSel.some(node => node.value === srcVal);
  }

  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => .${this.cssClass(opts)}`;
  }

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.source}`, this.asDebug(opts)];
    result = result.concat(super.debug(opts));
    this.classes.forEach((blockClass) => {
      result.push(blockClass.asDebug(opts));
      result = result.concat(blockClass.debug(opts));
    });
    return result;
  }
}

export class ExclusiveStateGroup extends StateContainer {
  private _name: string;
  private _parent: Block | BlockClass;

  constructor(name: string, parent: Block | BlockClass) {
    super();
    this._parent = parent;
    this._name = name;
  }

  get stateContainer(): Block | BlockClass | ExclusiveStateGroup {
    return this;
  }

  get block(): Block {
    if (this._parent instanceof Block) {
      return this._parent;
    } else {
      return this._parent.block;
    }
  }

  get blockClass(): BlockClass | null {
    if (this._parent instanceof BlockClass) {
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
  private _container: Block | BlockClass | ExclusiveStateGroup;
  private _name: string;

  constructor(name: string, container: Block | BlockClass | ExclusiveStateGroup) {
    this._container = container;
    this._name = name;
  }

  get block(): Block {
    if (this._container instanceof Block) {
      return this._container;
    }
    else if (this._container instanceof BlockClass) {
      return this._container.block;
    }
    else {
      return this._container.block;
    }
  }

  get blockClass(): BlockClass | null {
    if (this._container instanceof BlockClass) {
      return this._container;
    }
    else if (this._container instanceof ExclusiveStateGroup) {
      return this._container.blockClass;
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

  unqualifiedSource(): string {
    let source: string;
    if (this.blockClass) {
      source = ":substate(";
    } else {
      source = ":state(";
    }
    if (this.group) {
      source = source + `${this.group.name} `;
    }
    source = source + this.name + ")";
    return source;
  }

  asSource(): string {
    if (this.blockClass === null) {
      return this.unqualifiedSource();
    } else {
      return this.blockClass.asSource() + this.unqualifiedSource();
    }
  }

  localName(): string {
    let localNames: string[] = [];
    if (this.blockClass) {
      localNames.push(this.blockClass.localName());
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
        if (this.blockClass) {
          cssClassName = this.blockClass.cssClass(opts);
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

  matches(compoundSel: SelectorNode[]): boolean {
    let classVal: null | string = null;
    if (this.blockClass) {
      classVal = this.blockClass.name;
    }
    let pseudoVal = this.unqualifiedSource();
    if (classVal !== null) {
      if (!compoundSel.some(node => node.type === "class" && node.value === classVal)) {
        return false;
      }
    }
    return compoundSel.some(node => node.type === "pseudo" && node.toString() === pseudoVal);
  }
}

export class BlockClass extends ExclusiveStateGroupContainer implements Exportable {
  private _block: Block;
  private _name: string;
  constructor(name: string, block: Block) {
    super();
    this._name = name;
    this._block = block;
  }

  get block() { return this._block; }
  get name()  { return this._name;  }

  get groupContainer(): Block | BlockClass {
    return this;
  }

  get stateContainer(): Block | BlockClass | ExclusiveStateGroup {
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

  matches(compoundSel: SelectorNode[]): boolean {
    let srcVal = this.name;
    let found = compoundSel.some(node => node.value === srcVal);
    if (!found) return false;
    return !compoundSel.some(node => node.type === "pseudo" && node.value === ":substate");
  }
}
