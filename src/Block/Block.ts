import * as postcss from 'postcss';
import selectorParser = require('postcss-selector-parser');
import { SelectorFactory, parseSelector,
         ParsedSelector, CompoundSelector } from "opticss";
import { Attribute } from "@opticss/template-api";
import { ObjectDictionary, MultiMap, assertNever } from "@opticss/util";

import { stateParser, isClassNode, isStateNode, isRootNode,
         NodeAndType, BlockType, CLASS_NAME_IDENT } from "../BlockParser";
import { CssBlockError } from "../errors";
import { FileIdentifier } from "../importing";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";

import { LocalScopedContext, HasLocalScope, HasScopeLookup } from "../util/LocalScope";
import { unionInto } from '../util/unionInto';
import { Attr } from "@opticss/template-api";
import { objectValues } from "@opticss/util";
import { AttributeNS, ValueAbsent, ValueConstant } from "@opticss/template-api";

// TODO: remove circular dependency between LocalScope and Block

type BlockClassMap = ObjectDictionary<BlockClass>;

export const OBJ_REF_SPLITTER = (s: string): [string, string] | undefined => {
  let index = s.indexOf('.');
  if (index < 0) index = s.indexOf('[');
  if (index >= 0) {
    return [s.substr(0, index), s.substring(index)];
  }
  return;
};

/**
 * Abstract class that serves as the base for all BlockObjects. Contains basic
 * properties and abstract methods that extenders must implement.
 */
export abstract class BlockObject {
  protected _name: string;
  protected _container: BlockParent;
  protected _compiledAttribute: Attribute;

  public readonly propertyConcerns: PropertyContainer;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, container?: BlockParent){
    this._name = name;
    this._container = container;
    this.propertyConcerns = new PropertyContainer();
  }

  /**
   * Readonly name of this object.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Block parent container.
   */
  get parent(): BlockParent {
    return this._container;
  }

  /**
   * Get the inherited block object for this block object of the same name and type.
   * @returns The base inherited block object.
   */
  public abstract get base(): BlockObject | undefined;

  /**
   * Return the local identifier for this `BlockObject`.
   * @returns The local name.
   */
  public abstract localName(): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Return the source selector this `BlockObject` was read from.
   * @returns The source selector.
   */
  public abstract asSource(): string;

  /**
   * Return the css selector for this `BlockObject`.
   * @param opts Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(opts: OptionsReader): string;

  /**
   * Return true or false if the given `CompoundSelector`.
   * @param opts An options hash with an `outputMode` property of type `OutputMode` to switch output type.
   * @returns The CSS class.
   */
  public abstract matches(compoundSel: CompoundSelector): boolean;

  /**
   * Returns the list of all `BlockObjects` that are ancestors of this block.
   */
  public abstract all(): BlockObject[];

  /**
   * Crawl up the container tree and return the base block object.
   * @returns The base block in this container tree.
   */
  get block(): Block {
    let tmp: BlockObject | undefined = this;
    while (tmp.parent) {
      tmp = tmp.parent;
    }
    return <Block>tmp;
  }

  /**
   * Returns all the classes needed to represent this block object
   * including inherited classes.
   * @returns this object's css class and all inherited classes.
   */
  cssClasses(opts: OptionsReader): string[] {
    let classes = new Array<string>();
    for (let style of this.resolveStyles()) {
      classes.push(style.cssClass(opts));
    }
    return classes;
  }

  /**
   * Return all Block Objects that are implied by this object.
   * This takes inheritance, state/class correlations, and any
   * other declared links between styles into account.
   *
   * This block object is included in the returned result so the
   * resolved value's size is always 1 or greater.
   */
  public resolveStyles(): Set<BlockObject> {
    let styles = this.resolveInheritance();
    styles.add(this);
    return styles;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object but it does include all resolved styles
   * for inherited objects.
   *
   * If nothing is inherited, this returns an empty set.
   */
  resolveInheritance(): Set<BlockObject> {
    let inherited = new Set<BlockObject>();
    inherited.add(this);
    if (this.base) {
      unionInto(inherited, this.base.resolveStyles());
    }
    return inherited;
  }

  asCompiledAttributes(opts: OptionsReader): Attribute[] {
    if (!this._compiledAttribute) {
      let classNames = this.cssClasses(opts);
      let classValue = (classNames.length > 1) ?
        {allOf: classNames.map(c => ({constant: c}))} :
        {constant: classNames[0]};
      this._compiledAttribute = new Attribute("class", classValue);
    }
    return [this._compiledAttribute];
  }

  /**
   * Standard export method for a given block.
   * @param opts  Options for rendering cssClass.
   * @returns The Export object representing this BlockObject.
   */
  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
  }

  /**
   * Debug utility to help log BlockObjects
   * @param opts  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => ${this.cssClasses(opts).map(n => `.${n}`).join(" ")}`;
  }

}

export class Block extends BlockObject
  implements SelectorFactory,
             HasLocalScope<Block, BlockObject>,
             HasScopeLookup<BlockObject>
{
  private _sourceAttribute: Attribute;
  private _classes: BlockClassMap = {};
  private _blockReferences: ObjectDictionary<Block> = {};
  private _identifier: FileIdentifier;
  private _base?: Block;
  private _baseName?: string;
  private _implements: Block[] = [];
  private _localScope: LocalScopedContext<Block, BlockObject>;
  /**
   * array of paths that this block depends on and, if changed, would
   * invalidate the compiled css of this block. This is usually only useful in
   * preprocessed blocks.
   */
  private _dependencies: Set<string>;

  root?: postcss.Root;

  public readonly states: StateContainer;
  public readonly parsedRuleSelectors: WeakMap<postcss.Rule,ParsedSelector[]>;

  private hasHadNameReset = false;

  constructor(name: string, identifier: FileIdentifier) {
    super(name);
    this._identifier = identifier;
    this.parsedRuleSelectors = new WeakMap();
    this.states = new StateContainer(this);
    this._localScope = new LocalScopedContext<Block, BlockObject>(OBJ_REF_SPLITTER, this);
    this._dependencies = new Set<string>();
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    if ( this.hasHadNameReset ) {
      throw new CssBlockError('Can not set block name more than once.');
    }
    this._name = name;
    this.hasHadNameReset = true;
  }

  /// Start of methods to implement LocalScope<Block, BlockObject>
  subScope(name: string): LocalScopedContext<Block, BlockObject> | undefined {
    let block = this._blockReferences[name];
    if (block) {
      return block._localScope;
    } else {
      return;
    }
  }
  lookupLocal(name: string): BlockObject | undefined {
    return this._blockReferences[name] ||
           this.all(false).find(o => o.asSource() === name);
  }
  /// End of methods to implement LocalScope<Block, BlockObject>

  /// Start of methods to implement LocalScope<Block, BlockObject>
  /**
   * Lookup a sub-block either locally, or on a referenced foreign block.
   * @param reference
   *   A reference to a block object adhering to the following grammar:
   *     reference -> <ident> '.' <sub-reference>  // reference through sub-block <ident>
   *                | <ident>                      // reference to sub-block <ident>
   *                | '.' <class-selector>         // reference to class in this block
   *                | <state-selector>             // reference to state in this block
   *                | '.'                          // reference to this block
   *     sub-reference -> <ident> '.' <sub-reference> // reference through sub-sub-block
   *                    | <object-selector>        // reference to object in sub-block
   *     object-selector -> <block-selector>       // reference to this sub-block
   *                      | <class-selector>       // reference to class in sub-block
   *                      | <state-selector>       // reference to state in this sub-block
   *     block-selector -> 'root'
   *     class-selector -> <ident>
   *     state-selector -> '[state|' <ident> ']'
   *     ident -> regex:[a-zA-Z_-][a-zA-Z0-9]*
   *   A single dot by itself returns the current block.
   * @returns The BlockObject referenced at the supplied path.
   */
  lookup(reference: string): BlockObject | undefined {
    return this._localScope.lookup(reference);
  }

  /// End of methods to implement LocalScope<Block, BlockObject>

  asSourceAttributes(): Attribute[] {
    if (!this._sourceAttribute) {
      this._sourceAttribute = new Attribute("class", {constant: "root"});
    }
    return [this._sourceAttribute];
  }

  /**
   * Add an absolute, normalized path as a compilation dependency. This is used
   * to invalidate caches and trigger watchers when those files change.
   *
   * It is not necessary or helpful to add css-block files.
   */
  addDependency(filepath: string) {
    this._dependencies.add(filepath);
  }

  get dependencies(): string[] {
    return new Array(...this._dependencies);
  }

  get base(): Block | undefined {
    return this._base;
  }

  get baseName(): string | undefined {
    return this._baseName;
  }

  get identifier(): FileIdentifier {
    return this._identifier;
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

  /**
   * Validate that this block implements all foreign selectors from blocks it impelemnts.
   * @param b The block to check implementation against.
   * @returns The BlockObjects from b that are missing in the block.
   */
  checkImplementation(b: Block): BlockObject[] {
    let missing: BlockObject[] = [];
    b.all().forEach((o: BlockObject) => {
      if (!this.find(o.asSource())) {
        missing.push(o);
      }
    });
    return missing;
  }

  /**
   * Validate that all foreign blocks this block implements are fully...implemented.
   */
  checkImplementations(): void {
    this.implementsBlocks.forEach((b: Block) => {
      let missingObjs: BlockObject[] = this.checkImplementation(b);
      let missingObjsStr = missingObjs.map(o => o.asSource()).join(", ");
      if (missingObjs.length > 0) {
        let s = missingObjs.length > 1 ? 's' : '';
        throw new CssBlockError( `Missing implementation${s} for: ${missingObjsStr} from ${b.identifier}`);
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

  eachBlockReference(callback: (name: string, block: Block) => any) {
     Object.keys(this._blockReferences).forEach((name) => {
       callback(name, this._blockReferences[name]);
     });
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
        return assertNever(opts.outputMode);
    }
  }

  localName(): string {
    return "root";
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

  transitiveBlockDependencies(): Set<Block> {
    let deps = new Set<Block>();
    this.eachBlockReference((_name, block) => {
      deps.add(block);
      let moreDeps = block.transitiveBlockDependencies();
      if (moreDeps.size > 0) {
        deps = new Set([...deps, ...moreDeps]);
      }
    });
    return deps;
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include inherited objects.
   * @returns Array of BlockObjects.
   */
  all(shallow?: boolean): BlockObject[] {
    let result: BlockObject[] = [this];
    result = result.concat(this.states.all());
    this.classes.forEach((blockClass) => {
      result = result.concat(blockClass.all());
    });
    if (!shallow && this.base) {
      result = result.concat(this.base.all(shallow));
    }
    return result;
  }

  merged(): MultiMap<string, BlockObject>{
    let map = new MultiMap<string, BlockObject>();
    for (let obj of this.all()) {
      map.set(obj.asSource(), obj);
    }
    return map;
  }

  asSource(): string {
    return '.root';
  }

  /**
   * Fetch a the cached `BlockObject` from `Block` given `NodeAndType`.
   * @param obj The `NodeAndType` object to use for `BlockObject` lookup.
   */
  nodeAndTypeToBlockObject(obj: NodeAndType): BlockObject | undefined {
    switch (obj.blockType) {
      case BlockType.root:
        return this;
      case BlockType.state:
        return this.states._getState(stateParser(<selectorParser.Attribute>obj.node));
      case BlockType.class:
        return this.getClass(obj.node.value!);
      case BlockType.classState:
        let classNode = obj.node.prev();
        let classObj = this.getClass(classNode.value!);
        if (classObj) {
          return classObj.states._getState(stateParser(<selectorParser.Attribute>obj.node));
        }
        return undefined;
      default:
        return assertNever(obj.blockType);
    }
  }

  nodeAsBlockObject(node: selectorParser.Node): [BlockObject, number] | null {
    if (node.type === selectorParser.CLASS && node.value === "root") {
      return [this, 0];
    } else if (node.type === selectorParser.TAG) {
      let otherBlock = this.getReferencedBlock(node.value!);
      if (otherBlock) {
        let next = node.next();
        if (next && isClassNode(next)) {
          let klass = otherBlock.getClass(next.value!);
          if (klass) {
            let another = next.next();
            if (another && isStateNode(another)) {
              let info = stateParser(<selectorParser.Attribute>another);
              let state = klass.states._getState(info);
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
        } else if (next && isStateNode(next)) {
          let info = stateParser(<selectorParser.Attribute>next);
          let state = otherBlock.states._getState(info);
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
      let klass = this.getClass(node.value!);
      if (klass === undefined) {
        return null;
      }
      let next = node.next();
      if (next && isStateNode(next)) {
        let info = stateParser(<selectorParser.Attribute>next);
        let state = klass.states._getState(info);
        if (state === undefined) {
          return null;
        } else {
          return [state, 1];
        }
      } else {
        return [klass, 0];
      }
    } else if (isStateNode(node)) {
      let info = stateParser(<selectorParser.Attribute>node);
      let state = this.states._ensureState(info);
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
    let s = this.rewriteSelectorToString(selector, opts);
    return parseSelector(s)[0];
  }

  matches(compoundSel: CompoundSelector): boolean {
    return compoundSel.nodes.some(node => isRootNode(node));
  }

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.identifier}`, this.asDebug(opts)];
    let sourceNames = new Set<string>(this.all().map(o => o.asSource()));
    let sortedNames = [...sourceNames].sort();
    sortedNames.forEach(n => {
      if (n !== ".root") {
        let o = this.find(n) as BlockObject;
        result.push(o.asDebug(opts));
      }
    });
    return result;
  }

  /**
   * Test if the supplied block is the same block object.
   * @param other  The other Block to test against.
   * @return True or False if self and `other` are equal.
   */
  equal(other: Block | undefined | null) {
    return other && this.identifier === other.identifier;
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

  /**
   * TODO: Move selector cache into `parseSelector` and have consumers of this
   *       method interface with the parseSelector utility directly.
   * Given a PostCSS Rule, ensure it is present in this Block's parsed rule
   * selectors cache, and return the ParsedSelector array.
   * @param rule  PostCSS Rule
   * @return ParsedSelector array
   */
  getParsedSelectors(rule: postcss.Rule): ParsedSelector[] {
    let sels = this.parsedRuleSelectors.get(rule);
    if (!sels) {
      sels = parseSelector(rule);
      this.parsedRuleSelectors.set(rule, sels);
    }
    return sels;
  }

  /**
   * Objects that contain Blocks are often passed into assorted libraries' options
   * hashes. Some libraries like to `JSON.stringify()` their options to create
   * unique identifiers for re-run caching. (ex: Webpack, awesome-typescript-loader)
   * Blocks contain circular dependencies, so we need to override their `toJSON`
   * method so these libraries don't implode.
   * @return The name of the block.
   */
  toJSON(){
    return this._name;
  }
}

export function isBlock(o: object): o is Block {
  return o instanceof Block;
}

type Properties = Set<string>;

/**
 * Cache and interface methods for block properties.
 */
export class PropertyContainer {
  private props: Properties = new Set();
  private pseudoProps = new Map<string,Properties>();

  /**
   * Track a single property.
   * @param	property	The property we're tracking
   * @param	pseudo	The pseudo element this rule is styling, if applicable.
   */
  addProperty(property: string, pseudo?: string) {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoProps.get(pseudo) || new Set();
      this.pseudoProps.set(pseudo, props);
    } else {
      props = this.props;
    }
    props.add(property);
  }

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param	rule	PostCSS ruleset
   * @param	block	External block
   */
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

  /**
   * Retreive properties from all rulesets in this block.
   * @param	pseudo	Optional pseudo element to get properties from
   * @returns A set of property names.
   */
  getProperties(pseudo?: string): Set<string> {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoProps.get(pseudo) || new Set();
      this.pseudoProps.set(pseudo, props);
      return props;
    } else {
      return this.props;
    }
  }

  /**
   * Retrieve the pseudo elements which were found to have properties.
   * @returns A set of property names.
   */
  getPseudos(): Set<string> {
    return new Set(this.pseudoProps.keys());
  }
}

/**
 * A Map of State objects
 */
type StateMap = ObjectDictionary<State>;

/**
 * A Map of State maps, holds groups of States
 */
type GroupMap = ObjectDictionary<StateMap>;

/**
 * Holds state values to be passed to the StateContainer.
 */
export interface StateInfo {
  group?: string;
  name: string;
}

/**
 * Cache and interface methods for block states and state groups.
 */
export class StateContainer {
  private _states: StateMap = {};
  private _groups: GroupMap = {};
  private _parent: Block | BlockClass;

  /**
   * Save a reference to our parent element on instantiation. Only Blocks and
   * BlockClasses can contain States.
   */
  constructor(parent: Block | BlockClass){
    this._parent = parent;
  }

  /**
   * Parent accessor.
   * @returns The parent object that contains these States
   */
  get parent(): StateParent {
    return this._parent;
  }

  /**
   * Insert a state into this container
   * @param state The State object to insert.
   * @param group Optional group name for this state object.
   * @returns The State that was just added
   */
  addState(state: State): State {
    let group: string | null = state.group;
    if (group) {
      this._groups[group] = (this._groups[group] || {});
      return this._groups[group][state.name] = state;
    } else {
      return this._states[state.name] = state;
    }
  }

  /**
   * Group getter. Returns a list of State objects in the requested group.
   * @param group State group for lookup or a boolean state name if substate is not provided.
   * @param substate Optional substate to filter states by.
   * @returns An array of all States that were requested.
   */
  getGroup(groupName: string, substate?: string|undefined): State[] {
    let group = this._groups[groupName];
    if ( group ) {
      if (substate && group[substate]) {
        return [group[substate]];
      }
      else if (substate) {
        return [];
      }
      else {
        return objectValues(group);
      }
    }
    else if (substate) {
      return [];
    }
    else if (this._states[groupName]) {
      return [this._states[groupName]];
    } else {
      return [];
    }
  }

  /**
   * like getGroup but includes the states from all super blocks for the group.
   * @param group State group for lookup
   * @param substate Optional substate to filter states by.
   * @returns A map of resolved state names to their states for all States that were requested.
   */
  resolveGroup(groupName: string, substate?: string|undefined): ObjectDictionary<State> | undefined {
    let resolution: {[name: string]: State} = {};
    this.getGroup(groupName, substate).forEach(state => {
      resolution[state.name] = state;
    });
    if (substate && resolution[substate]) {
      return resolution;
    }
    let base = this._parent.base;
    if (base) {
      let baseResolution = base.states.resolveGroup(groupName, substate);
      if (baseResolution) {
        resolution = Object.assign(baseResolution, resolution); // overwrite any base definitions with their overrides.
      }
    }
    if (Object.keys(resolution).length === 0) {
      return undefined;
    } else {
      return resolution;
    }
  }

  getGroups(): string[] {
    return Object.keys(this._groups);
  }

  getStates(group?: string): Array<State> | undefined {
    if (group) {
      let groupValue = this._groups[group];
      if (groupValue) {
        return objectValues(groupValue);
      } else {
        return undefined;
      }
    } else {
      return objectValues(this._states);
    }
  }

  /**
   * State getter
   * @param name The State's name to lookup.
   * @param group  Optional state group for lookup
   * @returns The State that was requested, or undefined
   */
  getState(name: string, group?: string): State | undefined {
    return group ? this._groups[group] && this._groups[group][name] : this._states[name];
  }

  /**
   * Legacy State getter
   * @param info The StateInfo type to lookup, contains `name` and `group`
   * @returns The State that was requested, or undefined
   */
  _getState(info: StateInfo): State | undefined {
    return info.group ? this._groups[info.group] && this._groups[info.group][info.name] : this._states[info.name];
  }

  /**
   * Ensure that a `State` with the given `name` and `group` is registered with this Block.
   * @param name The State's name to ensure.
   * @param group  Optional state group for lookup/registration
   * @return The `State` object on this `Block`
   */
  ensureState(name: string, group?: string): State {
    let state = this.getState(name, group);
    if (state) {
      return state;
    } else {
      let state = new State(name, group, this.parent);
      return this.addState(state);
    }
  }

  /**
   * Legacy state ensurer. Ensure that a `State` with the given `StateInfo` is
   * registered with this Block.
   * @param info  `StateInfo` to verify exists on this `Block`
   * @return The `State` object on this `Block`
   */
  _ensureState(info: StateInfo): State {
    // Could assert that the stateinfo group name matched but yolo.
    if (this.getState(info.name, info.group)) {
      return <State>this.getState(info.name, info.group);
    } else {
      let state = new State(info.name, info.group, this.parent);
      return this.addState(state);
    }
  }

  /**
   * Debug utility to help test StateContainer.
   * @param options  Options to pass to States' asDebug method.
   * @return Array of debug strings for these states
   */
  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    this.all().forEach((state) => {
      result.push(state.asDebug(opts));
    });
    return result;
  }

  /**
   * Returns all states contained in this Container
   * @return Array of all State objects
   */
  all(): State[] {
    let result: State[] = [];
    for (let group of objectValues(this._groups)) {
      result.push(...objectValues(group));
    }
    result.push(...objectValues(this._states));
    return result;
  }
}

/**
 * Interface used when exporting a BlockObject using `asExport`.
 */
export interface Export {
  identifier: string;
  value: string;
}

/** Parent types for a state */
export type StateParent = Block | BlockClass;

/**
 * Valid parent types for a BlockObject
 */
export type BlockParent = StateParent | undefined;

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends BlockObject {
  private _sourceAttribute: Attribute;

  public readonly states: StateContainer;

  /**
   * BlockClass constructor
   * @param name Name for this BlockClass instance
   * @param parent The parent block of this class.
   */
  constructor(name: string, parent: Block) {
    super(name, parent);

    // BlockClases may contain states, provide it a place to put them.
    this.states = new StateContainer(this);
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

  /**
   * Export as original class name.
   * @returns String representing original class.
   */
  asSource(): string {
    return `.${this.name}`;
  }

  asSourceAttributes(): Attribute[] {
    if (!this._sourceAttribute) {
      this._sourceAttribute = new Attribute("class", {constant: this.name});
    }
    return [this._sourceAttribute];
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this.block.name}__${this.name}`;
      default:
        throw "this never happens";
    }
  }

  /**
   * @returns Whether the given selector refers to this class
   */
  matches(compoundSel: CompoundSelector): boolean {
    let srcVal = this.name;
    let found = compoundSel.nodes.some(node => node.type === selectorParser.CLASS && node.value === srcVal);
    if (!found) return false;
    return !compoundSel.nodes.some(node => isStateNode(node));
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
   * @returns Array of BlockObjects.
   */
  all(shallow?: boolean): BlockObject[] {
    let result: BlockObject[] = [this];
    if (!shallow) {
      result = result.concat(this.states.all());
    }
    return result;
  }

}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}

/**
 * States represent a state attribute selector in a particular Block. States may
 * optionally be a member of a group of states, and or designated "global".
 */
export class State extends BlockObject {
  private _sourceAttributes: Attr[];
  private _group: string | null;
  isGlobal = false;

  /**
   * State constructor. Provide a local name for this State, an optional group name,
   * and the parent container.
   * @param name The local name for this state.
   * @param group An optional parent group name.
   * @param container The parent container of this State.
   */
  constructor(name: string, group: string | null | undefined = undefined, container: Block | BlockClass) {
    super(name, container);
    this._group = group || null;
  }

  /**
   * Retrieve the BlockClass that this state belongs to, if applicable.
   * @returns The parent block class, or null.
   */
  get blockClass(): BlockClass | null {
    if (this._container instanceof BlockClass) {
      return this._container;
    } else {
      return null;
    }
  }

  /**
   * Retrieve this state's group name, if applicable.
   * @returns The parent group name, or null.
   */
  get group(): string | null {
    return this._group;
  }

  unqualifiedSource(): string {
    let source = "[state|";
    if (this.group) {
      source = source + `${this.group}=`;
    }
    source = source + this.name + "]";
    return source;
  }

  /**
   * Retrieve this State's selector as it appears in the Block source code.
   * @returns The State's attribute selector
   */
  asSource(): string {
    if (this.blockClass === null) {
      return this.unqualifiedSource();
    } else {
      return this.blockClass.asSource() + this.unqualifiedSource();
    }
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      let value: ValueConstant | ValueAbsent;
      let name: string;
      if (this.group) {
        name = this.group;
        value = {constant: this.name};
      } else {
        name = this.name;
        value = {absent: true};
      }
      if (this.blockClass) {
        let classAttr = this.blockClass.asSourceAttributes();
        this._sourceAttributes.push(...classAttr);
      }
      this._sourceAttributes.push(new AttributeNS("state", name, value));
    }
    return this._sourceAttributes;
  }

  /**
   * Retrieve this State's local name, including the optional BlockClass and group designators.
   * @returns The State's local name.
   */
  localName(): string {
    let localNames: string[] = [];
    if (this.blockClass) {
      localNames.push(this.blockClass.localName());
    }
    if (this.group) {
      localNames.push(`${this.group}-${this.name}`);
    } else {
      localNames.push(this.name);
    }
    return localNames.join("--");
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
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
          return `${cssClassName}--${this.group}-${this.name}`;
        } else {
          return `${cssClassName}--${this.name}`;
        }
      default:
        throw "this never happens";
    }
  }

  /**
   * Given a StateInfo object, return whether this State object has the same group and name.
   * @param info StateInfo to compare against
   * @returns True or false.
   */
  private sameNameAndGroup(info: StateInfo): boolean {
    if (info.name === this.name) {
      if (this.group && info.group) {
        return this.group === info.group;
      } else {
        return !(this.group || this.group);
      }
    } else {
      return false;
    }
  }

  /**
   * @returns Whether the given selector refers to this state
   */
  matches(compoundSel: CompoundSelector): boolean {
    let classVal: null | string = null;
    if (this.blockClass) {
      classVal = this.blockClass.name;
      if (!compoundSel.nodes.some(node => node.type === "class" && node.value === classVal)) {
        return false;
      }
      return compoundSel.nodes.some(node => isStateNode(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    } else {
      return compoundSel.nodes.some(node => isStateNode(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    }
  }

  /**
   * Get the base inherited block object.
   * @returns The base inherited block object.
   */
  get base() {
    let info: StateInfo = {name: this.name};
    if (this.group) {
      info.group = this.group;
    }
    if (this.blockClass) {
      let base = this.block.base;
      while (base) {
        let cls = base.getClass(this.blockClass.name);
        if (cls) {
          let state = cls.states._getState(info);
          if (state) return state;
        }
        base = base.base;
      }
    } else {
      let base = this.block.base;
      while (base) {
        let state = base.states._getState(info);
        if (state) return state;
        base = base.base;
      }
    }
    return undefined;
  }

  /**
   * Return array self and all children.
   * @returns Array of BlockObjects.
   */
  all(): BlockObject[] {
    return [this];
  }

}

export function isState(o: object): o is State {
  return o instanceof State;
}

export function isSubState(o: object): o is State {
  return o instanceof State && o.group !== null;
}
