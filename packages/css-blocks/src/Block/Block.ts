import * as postcss from 'postcss';
import selectorParser = require('postcss-selector-parser');
import { SelectorFactory, parseSelector,
         ParsedSelector, CompoundSelector } from "opticss";
import { Attribute, Attr, AttributeNS, ValueAbsent, ValueConstant, AttributeValueChoice } from "@opticss/element-analysis";
import { ObjectDictionary, MultiMap, assertNever } from "@opticss/util";

import { stateParser, isClassNode, isStateNode,
         NodeAndType, BlockType, CLASS_NAME_IDENT } from "../BlockParser";
import { CssBlockError } from "../errors";
import { FileIdentifier } from "../importing";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";
import { LocalScopedContext, HasLocalScope, HasScopeLookup } from "../util/LocalScope";
import { unionInto } from '../util/unionInto';
import { objectValues } from "@opticss/util";

export const OBJ_REF_SPLITTER = (s: string): [string, string] | undefined => {
  let index = s.indexOf('.');
  if (index < 0) index = s.indexOf('[');
  if (index >= 0) {
    return [s.substr(0, index), s.substring(index)];
  }
  return;
};

export type Style = BlockClass | State | SubState;
export type StyleContainer = Block | BlockClass | State | null;

/**
 * Abstract class that serves as the base for all Styles. Contains basic
 * properties and abstract methods that extenders must implement.
 */
export abstract class BlockObject<StyleType extends Style, ContainerType extends StyleContainer = StyleContainer> {
  public readonly propertyConcerns: PropertyContainer;

  protected _name: string;
  protected _container: ContainerType;
  protected _compiledAttribute: Attribute;

  /** cache of resolveStyles() */
  private _resolvedStyles: Set<Style> | undefined;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, container: ContainerType){
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
  get parent(): ContainerType {
    return this._container;
  }

  /**
   * Get the inherited block object for this block object of the same name and type.
   * @returns The base inherited block object.
   */
  public abstract get base(): StyleType | undefined;

  /**
   * Return the local identifier for this `Style`.
   * @returns The local name.
   */
  public abstract localName(): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Return the source selector this `Style` was read from.
   * @returns The source selector.
   */
  public abstract asSource(): string;

  /**
   * Return the css selector for this `Style`.
   * @param opts Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(opts: OptionsReader): string;

  /**
   * Crawl up the container tree and return the base block object.
   * @returns The base block in this container tree.
   */
  public abstract get block(): Block;

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
  public resolveStyles(): Set<Style> {
    if (this._resolvedStyles) {
      return new Set(this._resolvedStyles);
    }

    let inheritedStyles = this.resolveInheritance();
    this._resolvedStyles = new Set(inheritedStyles);
    this._resolvedStyles.add(this.asStyle());

    for (let s of inheritedStyles) {
      let implied = s.impliedStyles();
      if (!implied) continue;
      for (let i of implied) {
        unionInto(this._resolvedStyles, i.resolveStyles());
      }
    }

    return new Set(this._resolvedStyles);
  }

  /**
   * Returns the styles that are directly implied by this style.
   * Does not include the styles that this style inherits implied.
   * Does not include the styles that this style implies inherits.
   *
   * returns undefined if no styles are implied.
   */
  impliedStyles(): Set<Style> | undefined {
    return undefined;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * If nothing is inherited, this returns an empty set.
   */
  resolveInheritance(): Array<StyleType> {
    let inherited = new Array<StyleType>();
    let base: StyleType | undefined = this.base;
    while (base) {
      inherited.unshift(base);
      base = <StyleType | undefined>base.base;
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
   * @returns The Export object representing this Style.
   */
  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
  }

  /**
   * Debug utility to help log Styles
   * @param opts  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => ${this.cssClasses(opts).map(n => `.${n}`).join(" ")}`;
  }

  private asStyle(): StyleType {
    return <StyleType><any>this;
  }
}

export class Block
  implements SelectorFactory,
             HasLocalScope<Block, Style>,
             HasScopeLookup<Style>
{
  private _name: string;
  private _classes: ObjectDictionary<BlockClass> = {};
  private _rootClass: BlockClass;
  private _blockReferences: ObjectDictionary<Block> = {};
  private _identifier: FileIdentifier;
  private _base?: Block;
  private _baseName?: string;
  private _implements: Block[] = [];
  private _localScope: LocalScopedContext<Block, Style>;
  private hasHadNameReset = false;
  /**
   * array of paths that this block depends on and, if changed, would
   * invalidate the compiled css of this block. This is usually only useful in
   * preprocessed blocks.
   */
  private _dependencies: Set<string>;

  public stylesheet?: postcss.Root;
  public readonly parsedRuleSelectors: WeakMap<postcss.Rule,ParsedSelector[]>;

  constructor(name: string, identifier: FileIdentifier) {
    this._identifier = identifier;
    this._name = name;
    this.parsedRuleSelectors = new WeakMap();
    this._localScope = new LocalScopedContext<Block, Style>(OBJ_REF_SPLITTER, this);
    this._dependencies = new Set<string>();
    this._rootClass = new BlockClass('root', this);
    this.addClass(this._rootClass);
  }

  get name() {
    return this._name;
  }

  get rootClass(): BlockClass {
    return this._rootClass;
  }

  set name(name: string) {
    if ( this.hasHadNameReset ) {
      throw new CssBlockError('Can not set block name more than once.');
    }
    this._name = name;
    this.hasHadNameReset = true;
  }

  /// Start of methods to implement LocalScope<Block, Style>
  subScope(name: string): LocalScopedContext<Block, Style> | undefined {
    let block = this._blockReferences[name];
    if (block) {
      return block._localScope;
    } else {
      return;
    }
  }
  lookupLocal(name: string): Style | undefined {
    let blockRef = this._blockReferences[name];
    if (blockRef) {
      return blockRef.rootClass;
    } else {
      return this.all(false).find(o => o.asSource() === name);
    }
  }
  /// End of methods to implement LocalScope<Block, Style>

  /// Start of methods to implement LocalScope<Block, Style>
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
   * @returns The Style referenced at the supplied path.
   */
  lookup(reference: string): Style | undefined {
    return this._localScope.lookup(reference);
  }

  /// End of methods to implement LocalScope<Block, Style>

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
    return this._implements.slice();
  }

  addImplementation(b: Block) {
    return this._implements.push(b);
  }

  /**
   * Validate that this block implements all foreign selectors from blocks it impelemnts.
   * @param b The block to check implementation against.
   * @returns The Styles from b that are missing in the block.
   */
  checkImplementation(b: Block): Style[] {
    let missing: Style[] = [];
    b.all().forEach((o: Style) => {
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
      let missingObjs: Style[] = this.checkImplementation(b);
      let missingObjsStr = missingObjs.map(o => o.asSource()).join(", ");
      if (missingObjs.length > 0) {
        let s = missingObjs.length > 1 ? 's' : '';
        throw new CssBlockError( `Missing implementation${s} for: ${missingObjsStr} from ${b.identifier}`);
      }
    });
  }

  // This is a really dumb impl
  find(sourceName: string): Style | undefined {
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
           return blockRef.rootClass;
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
   * Returns a new array of ancestors in order of inheritance
   * with the first one being the immediate super block.
   *
   * If this block doesn't inherit, the array is empty.
   **/
  getAncestors(): Array<Block> {
    let inherited = new Array<Block>();
    let base = this.base;
    while (base) {
      inherited.push(base);
      base = base.base;
    }
    return inherited;
  }

  /**
   * Return array self and all children.
   * @param shallow Pass true to not include inherited objects.
   * @returns Array of Styles.
   */
  all(shallow?: boolean): Style[] {
    let result = new Array<Style>();
    for (let blockClass of this.classes) {
      result.push(...blockClass.all());
    }
    if (!shallow && this.base) {
      result.push(...this.base.all(shallow));
    }
    return result;
  }

  merged(): MultiMap<string, Style>{
    let map = new MultiMap<string, Style>();
    for (let obj of this.all()) {
      map.set(obj.asSource(), obj);
    }
    return map;
  }

  /**
   * Fetch a the cached `Style` from `Block` given `NodeAndType`.
   * @param obj The `NodeAndType` object to use for `Style` lookup.
   */
  nodeAndTypeToStyle(obj: NodeAndType): Style | undefined {
    switch (obj.blockType) {
      case BlockType.root:
        return this.rootClass;
      case BlockType.state:
        return this.rootClass._getState(stateParser(<selectorParser.Attribute>obj.node));
      case BlockType.class:
        return this.getClass(obj.node.value!);
      case BlockType.classState:
        let classNode = obj.node.prev();
        let classObj = this.getClass(classNode.value!);
        if (classObj) {
          return classObj._getState(stateParser(<selectorParser.Attribute>obj.node));
        }
        return undefined;
      default:
        return assertNever(obj.blockType);
    }
  }

  nodeAsStyle(node: selectorParser.Node): [Style, number] | null {
    if (node.type === selectorParser.CLASS && node.value === "root") {
      return [this.rootClass, 0];
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
              let state = klass._getState(info);
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
          let state = otherBlock.rootClass._getState(info);
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
        let state = klass._getState(info);
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
      let state = this.rootClass._ensureState(info);
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
      let result = this.nodeAsStyle(node);
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

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.identifier}`, this.rootClass.asDebug(opts)];
    let sourceNames = new Set<string>(this.all().map(s => s.asSource()));
    let sortedNames = [...sourceNames].sort();
    sortedNames.forEach(n => {
      if (n !== ".root") {
        let o = this.find(n) as Style;
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

  isAncestorOf(other: Block | undefined | null): boolean {
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
 * Holds state values to be passed to the StateContainer.
 */
export interface StateInfo {
  group?: string;
  name: string;
}

/**
 * Interface used when exporting a Style using `asExport`.
 */
export interface Export {
  identifier: string;
  value: string;
}

/** Parent types for a state */
export type StateParent = BlockClass | State;

/**
 * Valid parent types for a Style
 */
export type StyleParent = Block | BlockClass | State | undefined;

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends BlockObject<BlockClass, Block> {
  private _base: BlockClass | null | undefined;
  private _sourceAttribute: Attribute;
  private _states: StateMap = {};

  /**
   * BlockClass constructor
   * @param name Name for this BlockClass instance
   * @param parent The parent block of this class.
   */
  constructor(name: string, parent: Block) {
    super(name, parent);
  }

  get block(): Block {
    return this.parent;
  }

  get parent(): Block {
    return <Block>super.parent;
  }

  get isRoot(): boolean {
    return this.name === "root";
  }

  get base(): BlockClass | undefined {
    if (this._base !== undefined) {
      return this._base || undefined;
    }
    let base = this.block.base;
    while (base) {
      let cls = base.getClass(this.name);
      if (cls) {
        this._base = cls;
        return cls;
      }
      base = base.base;
    }
    this._base = null;
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
        if (this.isRoot) {
          return `${this.block.name}`;
        } else {
          return `${this.block.name}__${this.name}`;
        }
      default:
        throw "this never happens";
    }
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
   * @returns Array of Styles.
   */
  all(shallow?: boolean): Style[] {
    let result: Style[] = [this];
    if (!shallow) {
      result = result.concat(this.allStates());
    }
    return result;
  }

  /**
   * Group getter. Returns a list of State objects in the requested group that are defined
   * against this specific class. This does not take inheritance into account.
   * @param stateName State group for lookup or a boolean state name if substate is not provided.
   * @param subStateName Optional substate to filter states by.
   * @returns An array of all States that were requested.
   */
  getStateOrGroup(stateName: string, subStateName?: string|undefined): Array<State> | Array<SubState> {
    let state = this.getState(stateName);
    if (state) {
      if (subStateName) {
        let subState = state.getSubState(subStateName);
        if (subState) {
          return [subState];
        } else {
          return [];
        }
      } else if (state.hasSubStates) {
        return state.subStates;
      } else {
        return [state];
      }
    } else {
      return [];
    }
  }

  /**
   * Resolves the state with the given name from this class's inheritance
   * chain. Returns undefined if the state is not found.
   * @param stateName The name of the state to resolve.
   */
  resolveState(stateName: string): State | null {
    let klass: BlockClass | undefined = this;
    let state: State | null = null;
    while (!state && klass) {
      state = klass.getState(stateName);
      klass = klass.base;
    }
    return state;
  }

  /**
   * like getGroup but includes the states from all super blocks for the group.
   * @param group State group for lookup
   * @param substate Optional substate to filter states by.
   * @returns A map of resolved state names to their states for all States that were requested.
   */
  resolveGroup(groupName: string, substate?: string|undefined): ObjectDictionary<State | SubState> | undefined {
    let resolution: {[name: string]: State | SubState } = {};
    let states = this.getStateOrGroup(groupName, substate);
    for (let state of states) {
      resolution[state.name] = state;
    }
    if (substate && resolution[substate]) {
      return resolution;
    }
    let base = this.base;
    if (base) {
      let baseResolution = base.resolveGroup(groupName, substate);
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

  getGroups(): Set<string> {
    let groups = new Set<string>();
    let klass: BlockClass | undefined = this;
    while (klass) {
      for (let state of klass.states) {
        if (state.hasSubStates) {
          groups.add(state.name);
        }
      }
      klass = klass.base;
    }
    return groups;
  }

  get states(): Array<State> {
    return objectValues(this._states);
  }

  get booleanStates(): Array<State> {
    let states = new Array<State>();
    for (let state of this.states) {
      if (!state.hasSubStates) {
        states.push(state);
      }
    }
    return states;
  }

  /**
   * State getter
   * @param name The State's name to lookup.
   * @returns The State that was requested, or undefined
   */
  getState(name: string): State | null {
    return this._states[name] || null;
  }

  /**
   * Legacy State getter
   * @param info The StateInfo type to lookup, contains `name` and `group`
   * @returns The State that was requested, or undefined
   */
  _getState(info: StateInfo): State | SubState | undefined {
    if (info.group) {
      let state = this.getState(info.group);
      if (state) {
        return state.getSubState(info.name) || undefined;
      } else {
        return undefined;
      }
    } else {
      return this.getState(info.name) || undefined;
    }
  }

  /**
   * Ensure that a `State` with the given `name` is registered with this class.
   * @param name The State's name to ensure.
   * @return The `State` object on this `Block`
   */
  ensureState(name: string): State {
    if (!this._states[name]) {
      this._states[name] = new State(name, this);
    }
    return this._states[name];
  }

  /**
   * Ensure that a `SubState` with the given `subStateName` exists belonging to
   * the state named `stateName`. If the state does not exist, it is created.
   * @param stateName The State's name to ensure.
   * @param subStateName  Optional state group for lookup/registration
   */
  ensureSubState(stateName: string, subStateName: string): SubState {
    return this.ensureState(stateName).ensureSubState(subStateName);
  }

  /**
   * Legacy state ensurer. Ensure that a `State` with the given `StateInfo` is
   * registered with this Block.
   * @param info  `StateInfo` to verify exists on this `Block`
   * @return The `State` object on this `Block`
   */
  _ensureState(info: StateInfo): State | SubState {
    let state = this.ensureState(info.group || info.name);
    if (info.group) {
      return state.ensureSubState(info.name);
    } else {
      return state;
    }
  }

  /**
   * Debug utility to help test States.
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
   * Returns all concrete states defined against this class.
   * Does not take inheritance into account.
   */
  allStates(): Array<State | SubState> {
    let result: Array<State | SubState> = [];
    for (let state of objectValues(this._states)) {
      if (state.hasSubStates) {
        result.push(...state.subStates);
      } else {
        result.push(state);
      }
    }
    return result;
  }
}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}

/**
 * States represent a state attribute selector in a particular Block.
 * A State can have sub-states that are considered to be mutually exclusive.
 * States can be designated as "global";
 */
export class State extends BlockObject<State, BlockClass> {
  isGlobal = false;

  private _hasSubStates: boolean;
  private _base: State | null | undefined;
  private _subStates: undefined | ObjectDictionary<SubState>;
  private _sourceAttributes: Attr[];

  /**
   * State constructor. Provide a local name for this State, an optional group name,
   * and the parent container.
   * @param name The local name for this state.
   * @param group An optional parent group name.
   * @param container The parent container of this State.
   */
  constructor(name: string, container: BlockClass) {
    super(name, container);
    this._hasSubStates = false;
  }

  ensureSubState(name: string) {
    if (!this._subStates) {
      this._subStates = {};
    }
    if (!this._subStates[name]) {
      this._hasSubStates = true;
      this._subStates[name] = new SubState(name, this);
    }
    return this._subStates[name];
  }

  get subStates(): Array<SubState> {
    if (this._subStates) {
      return objectValues(this._subStates);
    } else {
      return [];
    }
  }

  /**
   * Resolves the sub-state with the given name from this state's inheritance
   * chain. Returns undefined if the sub-state is not found.
   * @param stateName The name of the sub-state to resolve.
   */
  resolveSubState(stateName: string): SubState | null {
    let state: State | undefined = this;
    let subState: SubState | null = null;
    while (!subState && state) {
      subState = state.getSubState(stateName);
      state = state.base;
    }
    return subState || null;
  }

  /**
   * returns whether this state has any sub states defined directly
   * or inherited.
   */
  hasResolvedSubStates(): boolean {
    return this.hasSubStates ||
      (this.base ? this.base.hasResolvedSubStates() : false);
  }

  /**
   * Resolves all sub-states from this state's inheritance
   * chain. Returns an empty object if no
   * @param stateName The name of the sub-state to resolve.
   */
  resolveSubStates(): ObjectDictionary<SubState> {
    let resolved: ObjectDictionary<SubState> = {};
    for (let base of this.resolveInheritance()) {
      if (base._subStates) {
        Object.assign(resolved, base._subStates);
      }
    }
    Object.assign(resolved, this._subStates);
    return resolved;
  }

  getSubState(name: string): SubState | null {
    return this._subStates && this._subStates[name] || null;
  }

  get block(): Block {
    return this.blockClass.block;
  }

  /**
   * Retrieve the BlockClass that this state belongs to, if applicable.
   * @returns The parent block class, or null.
   */
  get blockClass(): BlockClass {
    return this._container;
  }

  get hasSubStates(): boolean {
    return this._hasSubStates;
  }

  unqualifiedSource(): string {
    return `[state|${this.name}]`;
  }

  /**
   * Retrieve this State's selector as it appears in the Block source code.
   * @returns The State's attribute selector
   */
  asSource(): string {
    if (this.blockClass.isRoot) {
      return this.unqualifiedSource();
    } else {
      return this.blockClass.asSource() + this.unqualifiedSource();
    }
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      this._sourceAttributes.push(...this.blockClass.asSourceAttributes());
      let value: AttributeValueChoice | ValueAbsent;
      if (this.hasSubStates) {
        let values = new Array<ValueConstant>();
        for (let subState of this.subStates) {
          values.push({constant: subState.name});
        }
        value = {oneOf: values};
      } else {
        value = {absent: true};
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
    switch(opts.outputMode) {
      case OutputMode.BEM:
        let cssClassName = this.blockClass.cssClass(opts);
        return `${cssClassName}--${this.name}`;
      default:
        throw "this never happens";
    }
  }

  /**
   * Get the state that this state inherits from.
   */
  get base(): State | undefined {
    if (this._base !== undefined) {
      return this._base || undefined;
    }
    let baseClass: BlockClass | undefined = this._container.base;
    while (baseClass) {
      let state = baseClass.getState(this._name);
      if (state) {
        this._base = state;
        return state;
      }
      baseClass = baseClass.base;
    }
    this._base = null;
    return undefined;
  }

  /**
   * Return array self and all children.
   * @returns Array of Styles.
   */
  all(): Style[] {
    return [this];
  }

}

export class SubState extends BlockObject<SubState, State> {
  private _base: SubState | null | undefined;

  _sourceAttributes: Array<AttributeNS>;
  isGlobal = false;

  get base(): SubState | undefined {
    if (this._base !== undefined) {
      return this._base || undefined;
    }
    let baseState: State | undefined = this._container.base;
    while (baseState) {
      let subState = baseState.getSubState(this._name);
      if (subState) {
        this._base = subState;
        return subState;
      }
      baseState = baseState.base;
    }
    this._base = null;
    return undefined;
  }

  get block(): Block {
    return this._container.block;
  }

  localName(): string {
    return `${this._container.localName()}-${this.name}`;
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      this._sourceAttributes.push(new AttributeNS("state", this._container.name, {constant: this.name}));
    }
    return this._sourceAttributes.slice();
  }

  asSource(): string {
    let attr = `[state|${this._container.name}=${this.name}]`;
    let blockClass = this.blockClass;
    if (!blockClass.isRoot) {
      return `${blockClass.asSource()}${attr}`;
    } else {
      return attr;
    }
  }

  public cssClass(opts: OptionsReader): string {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this._container.cssClass(opts)}-${this.name}`;
      default:
        return assertNever(opts.outputMode);
    }
  }

  get blockClass(): BlockClass {
    return this._container.blockClass;
  }
}

export function isState(o: object): o is State {
  return o instanceof State;
}

export function isSubState(o: object): o is SubState {
  return o instanceof SubState;
}

export function isStateful(o: object): o is State | SubState {
  return isState(o) || isSubState(o);
}

export function isStyle(o: Object): o is Style {
  return isBlockClass(o) || isState(o) || isSubState(o);
}