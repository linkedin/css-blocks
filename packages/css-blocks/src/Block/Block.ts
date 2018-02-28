import { assertNever, MultiMap, ObjectDictionary } from "@opticss/util";
import { whatever } from "@opticss/util";
import {
  CompoundSelector,
  ParsedSelector,
  parseSelector,
} from "opticss";
import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");

import {
  BlockType,
  isClassNode,
  isStateNode,
  NodeAndType,
} from "../BlockParser";
import { stateName, stateValue } from "../BlockParser/block-intermediates";
import { BlockPath, CLASS_NAME_IDENT, ROOT_CLASS } from "../BlockSyntax";
import { OptionsReader } from "../OptionsReader";
import { SourceLocation } from "../SourceLocation";
import { CssBlockError, InvalidBlockSyntax } from "../errors";
import { FileIdentifier } from "../importing";
import { LocalScopedContext } from "../util/LocalScope";

import { BlockClass } from "./BlockClass";
import { Inheritable } from "./Inheritable";
import { Styles } from "./Styles";

export const OBJ_REF_SPLITTER = (s: string): [string, string] | undefined => {
  let index = s.indexOf(".");
  if (index < 0) index = s.indexOf("[");
  if (index >= 0) {
    return [s.substr(0, index), s.substring(index)];
  }
  return;
};

export class Block extends Inheritable<Block, Block, never, BlockClass> {
  private _rootClass: BlockClass;
  private _blockReferences: ObjectDictionary<Block> = {};
  private _blockReferencesReverseLookup: Map<Block, string> = new Map();
  private _identifier: FileIdentifier;
  private _implements: Block[] = [];
  private _localScope: LocalScopedContext<Block, Styles>;
  private hasHadNameReset = false;
  /**
   * array of paths that this block depends on and, if changed, would
   * invalidate the compiled css of this block. This is usually only useful in
   * pre-processed blocks.
   */
  private _dependencies: Set<string>;

  public stylesheet?: postcss.Root;
  public readonly parsedRuleSelectors: WeakMap<postcss.Rule, ParsedSelector[]>;

  constructor(name: string, identifier: FileIdentifier) {
    super(name);
    this._identifier = identifier;
    this.parsedRuleSelectors = new WeakMap();
    this._localScope = new LocalScopedContext<Block, Styles>(OBJ_REF_SPLITTER, this);
    this._dependencies = new Set<string>();
    this._rootClass = new BlockClass(ROOT_CLASS, this);
    this.addClass(this._rootClass);
  }

  get block(): Block { return this.root; }

  get name() { return this._name; }
  set name(name: string) {
    if (this.hasHadNameReset) {
      throw new CssBlockError("Can not set block name more than once.");
    }
    this._name = name;
    this.hasHadNameReset = true;
  }

  get rootClass(): BlockClass {
    return this._rootClass;
  }

  /// Start of methods to implement LocalScope<Block, Style>
  subScope(name: string): LocalScopedContext<Block, Styles> | undefined {
    let block = this._blockReferences[name];
    if (block) {
      return block._localScope;
    } else {
      return;
    }
  }

  lookupLocal(name: string): Styles | undefined {
    let blockRef = this._blockReferences[name];
    if (blockRef) {
      return blockRef.rootClass;
    } else {
      return this.all(false).find(o => o.asSource() === name);
    }
  }

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
  public lookup(path: string | BlockPath, errLoc?: SourceLocation): Styles | undefined {
    path = new BlockPath(path);
    let block = this.getReferencedBlock(path.block);
    if (!block) {
      if (errLoc) { throw new InvalidBlockSyntax(`No Block named "${path.block}" found in scope.`, errLoc); }
      return undefined;
    }
    let klass = block.resolveClass(path.class);
    let stateInfo = path.state;
    let state;
    if (klass && stateInfo) {
      state = klass.resolveState(stateInfo.name, stateInfo.value);
      if (!state) return undefined;
    }

    if (!state && !klass && errLoc) {
      throw new InvalidBlockSyntax(`No Style "${path.path}" found on Block "${block.name}".`, errLoc);
    }

    return state || klass || undefined;
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

  get identifier(): FileIdentifier {
    return this._identifier;
  }

  getClass(name: string): BlockClass | null { return name ? this.getChild(name) : this.getChild(ROOT_CLASS); }
  resolveClass(name: string): BlockClass | null { return name ? this.resolveChild(name) : this.resolveChild(ROOT_CLASS); }
  newChild(name: string): BlockClass { return new BlockClass(name, this); }

  // Alias protected methods from `Inheritable` to Block-specific names, and expose them as a public API.
  get classes(): BlockClass[] { return this.children(); }
  addClass(blockClass: BlockClass) { this.setChild(blockClass.name, blockClass); }
  ensureClass(name: string): BlockClass { return this.ensureChild(name); }

  getImplementedBlocks(): Block[] {
    return this._implements.slice();
  }

  addImplementation(b: Block) {
    return this._implements.push(b);
  }

  /**
   * Validate that this block implements all foreign selectors from blocks it implements.
   * @param b The block to check implementation against.
   * @returns The Styles from b that are missing in the block.
   */
  checkImplementation(b: Block): Styles[] {
    let missing: Styles[] = [];
    for (let o of b.all()) {
      if (!this.find(o.asSource())) {
        missing.push(o);
      }
    }
    return missing;
  }

  /**
   * Validate that all foreign blocks this block implements are fully...implemented.
   */
  checkImplementations(): void {
    for (let b of this.getImplementedBlocks()) {
      let missing: Styles[] = this.checkImplementation(b);
      let paths = missing.map(o => o.asSource()).join(", ");
      if (missing.length > 0) {
        let s = missing.length > 1 ? "s" : "";
        throw new CssBlockError(`Missing implementation${s} for: ${paths} from ${b.identifier}`);
      }
    }
  }

  // This is a really dumb impl
  find(sourceName: string): Styles | undefined {
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

  eachBlockReference(callback: (name: string, block: Block) => whatever) {
    for (let name of Object.keys(this._blockReferences)) {
      callback(name, this._blockReferences[name]);
    }
  }

  addBlockReference(localName: string, other: Block) {
    this._blockReferences[localName] = other;
    this._blockReferencesReverseLookup.set(other, localName);
  }

  getReferencedBlock(localName: string): Block | null {
    if (localName === "") { return this; }
    return this._blockReferences[localName] || null;
  }

  getReferencedBlockLocalName(block: Block | undefined): string | null {
    return block && this._blockReferencesReverseLookup.get(block) || null;
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
  all(shallow?: boolean): Styles[] {
    let result = new Array<Styles>();
    for (let blockClass of this.classes) {
      result.push(...blockClass.all());
    }
    if (!shallow && this.base) {
      result.push(...this.base.all(shallow));
    }
    return result;
  }

  merged(): MultiMap<string, Styles> {
    let map = new MultiMap<string, Styles>(false);
    for (let obj of this.all()) {
      map.set(obj.asSource(), obj);
    }
    return map;
  }

  /**
   * Fetch a the cached `Style` from `Block` given `NodeAndType`.
   * @param obj The `NodeAndType` object to use for `Style` lookup.
   */
  nodeAndTypeToStyle(obj: NodeAndType): Styles | null {
    switch (obj.blockType) {
      case BlockType.root:
        return this.rootClass;
      case BlockType.state:
        return this.rootClass.getState(stateName(obj.node), stateValue(obj.node));
      case BlockType.class:
        return this.getClass(obj.node.value);
      case BlockType.classState:
        let classNode = obj.node.prev();
        let classObj = this.getClass(classNode.value!);
        if (classObj) {
          return classObj.getState(stateName(obj.node), stateValue(obj.node));
        }
        return null;
      default:
        return assertNever(obj);
    }
  }

  nodeAsStyle(node: selectorParser.Node): [Styles, number] | null {
    if (node.type === selectorParser.CLASS && node.value === ROOT_CLASS) {
      return [this.rootClass, 0];
    } else if (node.type === selectorParser.TAG) {
      let otherBlock = this.getReferencedBlock(node.value);
      if (otherBlock) {
        let next = node.next();
        if (next && isClassNode(next)) {
          let klass = otherBlock.getClass(next.value);
          if (klass) {
            let another = next.next();
            if (another && isStateNode(another)) {
              let state = klass.getState(stateName(another), stateValue(another));
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
          let state = otherBlock.rootClass.getState(stateName(next), stateValue(next));
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
      if (klass === null) {
        return null;
      }
      let next = node.next();
      if (next && isStateNode(next)) {
        let state = klass.getState(stateName(next), stateValue(next));
        if (state === null) {
          return null;
        } else {
          return [state, 1];
        }
      } else {
        return [klass, 0];
      }
    } else if (isStateNode(node)) {
      let state = this.rootClass.ensureState(stateName(node), stateValue(node));
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
        newNodes.push(selectorParser.className({ value: result[0].cssClass(opts) }));
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
    // generating a string and re-parsing ensures the internal structure is consistent
    // otherwise the parent/next/prev relationships will be wonky with the new nodes.
    let s = this.rewriteSelectorToString(selector, opts);
    return parseSelector(s)[0];
  }

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.identifier}`, this.rootClass.asDebug(opts)];
    let sourceNames = new Set<string>(this.all().map(s => s.asSource()));
    let sortedNames = [...sourceNames].sort();
    for (let n of sortedNames) {
      if (n !== `.${ROOT_CLASS}`) {
        let o = this.find(n) as Styles;
        result.push(o.asDebug(opts));
      }
    }
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
   * Objects that contain Blocks are often passed into assorted libraries' options
   * hashes. Some libraries like to `JSON.stringify()` their options to create
   * unique identifiers for re-run caching. (ex: Webpack, awesome-typescript-loader)
   * Blocks contain circular dependencies, so we need to override their `toJSON`
   * method so these libraries don't implode.
   * @return The name of the block.
   */
  toJSON() {
    return this._name;
  }
}

export function isBlock(o?: object): o is Block {
  return o instanceof Block;
}
