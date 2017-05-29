import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");

import { OptionsReader } from "./options";
import { OutputMode } from "./OutputMode";
import { CssBlockError } from "./errors";
import parseSelector, { ParsedSelector, CompoundSelector } from "./parseSelector";
import { StateInfo, stateParser, isClass, isState, isBlock, NodeAndType, BlockTypes } from "./BlockParser";

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

type Properties = Set<string>;
export class PropertyConcerns {
  private concerns: Properties = new Set();
  private pseudoConcerns = new Map<string,Properties>();
  addProperty(property: string, pseudo?: string) {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoConcerns.get(pseudo) || new Set();
      this.pseudoConcerns.set(pseudo, props);
    } else {
      props = this.concerns;
    }
    props.add(property);
  }
  addProperties(rule: postcss.Rule, block: Block, filter?: (prop: string) => boolean) {
    let selectors = block.getParsedSelectors(rule);
    selectors.forEach((selector) => {
      let key = selector.key;
      let pseudo: string | undefined;
      if (key.pseudoelement) {
        pseudo = key.pseudoelement.toString();
      }
      rule.walkDecls((decl) => {
        if (!filter || filter && filter(decl.prop)) {
          this.addProperty(decl.prop, pseudo);
        }
      });
    });
  }
  getProperties(pseudo?: string): Set<string> {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoConcerns.get(pseudo) || new Set();
      this.pseudoConcerns.set(pseudo, props);
      return props;
    } else {
      return this.concerns;
    }
  }
  getPseudos(): Set<string> {
    return new Set(this.pseudoConcerns.keys());
  }
}

export abstract class StateContainer implements HasBlockObjects {
  private _states: StateMap = {};

  addState(state: State): void {
    this._states[state.name] = state;
  }

  abstract get stateContainer(): Block | BlockClass | ExclusiveStateGroup;

  getState(info: StateInfo): State | undefined {
    return this._states[info.name];
  }

  ensureState(info: StateInfo): State {
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

  getState(info: StateInfo): State | undefined {
    if (info.group) {
      let group = this._exclusiveStateGroups[info.group];
      return group.getState(info);
    } else {
      return super.getState(info);
    }
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
  private _base?: Block;
  private _baseName?: string;
  private _implements: Block[] = [];
  propertyConcerns = new PropertyConcerns();
  root?: postcss.Root;
  parsedRuleSelectors: WeakMap<postcss.Rule,ParsedSelector[]>;

  constructor(name: string, source: string) {
    super();
    this._name = name;
    this._source = source;
    this.parsedRuleSelectors = new WeakMap();
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

  get base(): Block | undefined {
    return this._base;
  }

  get baseName(): string | undefined {
    return this._baseName;
  }

  setBase(baseName: string, base: Block) {
    this._baseName = baseName;
    this._base = base;
  }

  getClass(name: string): BlockClass | undefined {
    return this._classes[name];
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
  find(sourceName: string): BlockObject | undefined {
    let blockRefName: string | undefined;
    let md = sourceName.match(CLASS_NAME_IDENT);
    if (md && md.index === 0) {
      blockRefName = md[0];
      let blockRef: Block | undefined;
      this.eachBlockReference((name, block) => {
        if (blockRefName === name) {
          blockRef = block;
        }
      });
      if (blockRef) {
        if (md[0].length === sourceName.length) {
          return blockRef;
        }
        return blockRef.find(sourceName.slice(md[0].length));
      } else {
        return undefined;
      }
    }
    return this.all().find(e => e.asSource() === sourceName);
  }

  get source() {
    return this._source;
  }

  get block() {
    return this;
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
    return "root";
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

  eachBlockReference(callback: (name: string, block: Block) => any) {
    Object.keys(this._blockReferences).forEach((name) => {
      callback(name, this._blockReferences[name]);
    });
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

  lookup(reference: string): BlockObject | undefined {
    let refMatch = reference.match(/^(\w+)(\W.*)?$/);
    if (refMatch) {
      let refName = refMatch[1];
      let subObjRef = refMatch[2];
      let refBlock = this._blockReferences[refName];
      if (refBlock === undefined) {
        return undefined;
      }
      if (subObjRef !== undefined) {
        return refBlock.lookup(subObjRef);
      } else {
        return refBlock;
      }
    }
    return this.all(false).find((o) => o.asSource() === reference); // <-- Super ineffecient algorithm. Better to parse the string and traverse directly.
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
    return `.root`;
  }

  nodeAndTypeToBlockObject(obj: NodeAndType): BlockObject | undefined {
    switch (obj.blockType) {
      case BlockTypes.block:
        return this;
      case BlockTypes.state:
        return this.getState(stateParser(<selectorParser.Attribute>obj.node));
      case BlockTypes.class:
        return this.getClass(obj.node.value);
      case BlockTypes.classState:
        let classNode = obj.node.prev();
        let classObj = this.getClass(classNode.value);
        if (classObj) {
          return classObj.getState(stateParser(<selectorParser.Attribute>obj.node));
        }
    }
    return undefined;
  }

  nodeAsBlockObject(node: selectorParser.Node): [BlockObject, number] | null {
    if (node.type === selectorParser.CLASS && node.value === "root") {
      return [this, 0];
    } else if (node.type === selectorParser.TAG) {
      let otherBlock = this.getReferencedBlock(node.value);
      if (otherBlock) {
        let next = node.next();
        if (next && isClass(next)) {
          let klass = otherBlock.getClass(next.value);
          if (klass) {
            let another = next.next();
            if (another && isState(another)) {
              let info = stateParser(<selectorParser.Attribute>another);
              let state = klass.getState(info);
              if (state) {
                return [state, 2];
              } else {
                return null; // this is invalid and should never happen.
              }
            } else {
              // we don't allow scoped classes not part of a state
              return null; // this is invalid and should never happen.
            }
          } else {
            return null;
          }
        } else if (next && isState(next)) {
          let info = stateParser(<selectorParser.Attribute>next);
          let state = otherBlock.getState(info);
          if (state) {
            return [state, 1];
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else if (node.type === selectorParser.CLASS) {
      let klass = this.getClass(node.value);
      if (klass === undefined) {
        return null;
      }
      let next = node.next();
      if (next && isState(next)) {
        let info = stateParser(<selectorParser.Attribute>next);
        let state = klass.getState(info);
        if (state === undefined) {
          return null;
        } else {
          return [state, 1];
        }
      } else {
        return [klass, 0];
      }
    } else if (isState(node)) {
      let info = stateParser(<selectorParser.Attribute>node);
      let state = this.ensureState(info);
      if (state) {
        return [state, 0];
      } else {
        return null;
      }
    }
    return null;
  }

  rewriteSelectorNodes(nodes: selectorParser.Node[], opts: OptionsReader): selectorParser.Node[] {
    let newNodes: selectorParser.Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      let result = this.nodeAsBlockObject(node);
      if (result === null) {
        newNodes.push(node);
      } else {
        newNodes.push(selectorParser.className({value: result[0].cssClass(opts)}));
        i += result[1];
      }
    }
    return newNodes;
  }

  rewriteSelectorToString(selector: ParsedSelector, opts: OptionsReader): string {
    let firstNewSelector = new CompoundSelector();
    let newSelector = firstNewSelector;
    let newCurrentSelector = newSelector;
    let currentSelector: CompoundSelector | undefined = selector.selector;
    do {
      newCurrentSelector.nodes = this.rewriteSelectorNodes(currentSelector.nodes, opts);
      newCurrentSelector.pseudoelement = currentSelector.pseudoelement;
      if (currentSelector.next !== undefined) {
        let tempSel = newCurrentSelector;
        newCurrentSelector = new CompoundSelector();
        tempSel.setNext(currentSelector.next.combinator, newCurrentSelector);
        currentSelector = currentSelector.next.selector;
      } else {
        currentSelector = undefined;
      }
    } while (currentSelector !== undefined);
    return firstNewSelector.toString();
  }

  rewriteSelector(selector: ParsedSelector, opts: OptionsReader): ParsedSelector {
    // generating a string and reparsing ensures the internal structure is consistent
    // otherwise the parent/next/prev relationships will be wonky with the new nodes.
    return parseSelector(this.rewriteSelectorToString(selector, opts))[0];
  }

  matches(compoundSel: CompoundSelector): boolean {
    return compoundSel.nodes.some(node => isBlock(node));
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

  equal(other: Block | undefined | null) {
    return other && this.source === other.source;
  }

  isAncestor(other: Block | undefined | null): boolean {
    let base: Block | undefined | null = other && other.base;
    while (base) {
      if (this.equal(base)) {
        return true;
      } else {
        base = base.base;
      }
    }
    return false;
  }

  getParsedSelectors(rule: postcss.Rule): ParsedSelector[] {
    let sels = this.parsedRuleSelectors.get(rule);
    if (!sels) {
      sels = parseSelector(rule.selector);
      this.parsedRuleSelectors.set(rule, sels);
    }
    return sels;
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

export class State implements Exportable {
  private _container: Block | BlockClass | ExclusiveStateGroup;
  private _name: string;
  propertyConcerns = new PropertyConcerns();
  isGlobal = false;

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
    let source = "[state|";
    if (this.group) {
      source = source + `${this.group.name}=`;
    }
    source = source + this.name + "]";
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

  private sameNameAndGroup(info: StateInfo): boolean {
    if (info.name === this.name) {
      if (this.group && info.group) {
        return this.group.name === info.group;
      } else {
        return !(this.group || this.group);
      }
    } else {
      return false;
    }
  }

  matches(compoundSel: CompoundSelector): boolean {
    let classVal: null | string = null;
    if (this.blockClass) {
      classVal = this.blockClass.name;
      if (!compoundSel.nodes.some(node => node.type === "class" && node.value === classVal)) {
        return false;
      }
      return compoundSel.nodes.some(node => isState(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    } else {
      return compoundSel.nodes.some(node => isState(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    }
  }

  get base() {
    let info: StateInfo = {name: this.name};
    if (this.group) {
      info.group = this.group.name;
    }
    if (this.blockClass) {
      let base = this.block.base;
      while (base) {
        let cls = base.getClass(this.blockClass.name);
        if (cls) {
          let state = cls.getState(info);
          if (state) return state;
        }
        base = base.base;
      }
    } else {
      let base = this.block.base;
      while (base) {
        let state = base.getState(info);
        if (state) return state;
        base = base.base;
      }
    }
    return undefined;
  }
}

export class BlockClass extends ExclusiveStateGroupContainer implements Exportable {
  private _block: Block;
  private _name: string;
  propertyConcerns = new PropertyConcerns();

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

  get base() {
    let base = this.block.base;
    while (base) {
      let cls = base.getClass(this.name);
      if (cls) return cls;
      base = base.base;
    }
    return undefined;
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

  matches(compoundSel: CompoundSelector): boolean {
    let srcVal = this.name;
    let found = compoundSel.nodes.some(node => node.type === selectorParser.CLASS && node.value === srcVal);
    if (!found) return false;
    return !compoundSel.nodes.some(node => isState(node));
  }
}
