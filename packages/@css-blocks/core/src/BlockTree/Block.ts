import { MultiMap, ObjectDictionary } from "@opticss/util";
import {
  CompoundSelector,
  ParsedSelector,
  parseSelector,
  postcss,
  postcssSelectorParser as selectorParser,
} from "opticss";

import { isAttributeNode, isClassNode } from "../BlockParser";
import { isRootNode, toAttrToken } from "../BlockParser";
import { BlockPath, CLASS_NAME_IDENT, DEFAULT_EXPORT, ROOT_CLASS } from "../BlockSyntax";
import { ResolvedConfiguration } from "../configuration";
import { CssBlockError, InvalidBlockSyntax, MultipleCssBlockErrors } from "../errors";
import { FileIdentifier } from "../importing";
import { SourceFile, SourceRange } from "../SourceLocation";

import { BlockClass } from "./BlockClass";
import { Inheritable } from "./Inheritable";
import { Styles } from "./Styles";

/**
 * In-memory representation of a Block. If you're thinking of CSS Blocks
 * in relation to the BEM architecture for CSS, this is the... well... "Block".
 * Well, with a slight caveat....
 *
 * The Block is always the root node of a BlockTree. The Block may be the
 * parent to any number of BlockClass nodes. Notably, the Block class only
 * stores meta information about the block. Any CSS properties assigned to the
 * `:scope` selector are stored on a special BlockClass node that is a child of
 * the Block. You can access this node directly through the
 * `rootClass` property.
 *
 * Block nodes store all data related to any `@block` imports, the
 * `block-name`, implemented Blocks, the inherited Block, and any other
 * metadata stored in the Block file.
 */
export class Block
  extends Inheritable<Block, Block, never, BlockClass> {

  private _blockReferences: ObjectDictionary<Block> = {};
  private _blockReferencesReverseLookup: Map<Block, string> = new Map();
  private _blockExports: ObjectDictionary<Block> = {};
  private _blockExportReverseLookup: Map<Block, string> = new Map();
  private _identifier: FileIdentifier;
  private _implements: Block[] = [];
  private _blockErrors: CssBlockError[] = [];
  private hasHadNameReset = false;

  /**
   * A unique identifier for this Block. Generally created from a hash
   * of the FileIdentifier and other process information.
   *
   * For caching to work properly, this GUID must be unique to the block and
   * shouldn't change between recompiles. You shouldn't use file contents to
   * create this hash.
   */
  public readonly guid: string;

  /**
   * array of paths that this block depends on and, if changed, would
   * invalidate the compiled css of this block. This is usually only useful in
   * pre-processed blocks.
   */
  private _dependencies: Set<string>;

  /**
   * A direct reference to the BlockClass that holds style information for the
   * `:scope` selector of this Block. The rootClass is also available through
   * other traversal methods, as you would access any other BlockClass that
   * belongs to this Block.
   */
  public readonly rootClass: BlockClass;

  /**
   * The PostCSS AST of the stylesheet this Block was built from. Used
   * primarily for error reporting, if present.
   */
  public stylesheet: postcss.Root | undefined;

  /**
   * Creates a new Block.
   *
   * @param name - The default name for this block. This can be reset once (and only once)
   *               using the `setName()` method.
   * @param identifier - An unique ID referencing the file/blob this Block is created from.
   * @param guid - The GUID for this block. This GUID should be unique. (BlockFactory is
   *               responsible for enforcing uniqueness.)
   * @param stylesheet - The PostCSS AST of the stylesheet this block is built from.
   */
  constructor(name: string, identifier: FileIdentifier, guid: string, stylesheet?: postcss.Root) {
    super(name);
    this._identifier = identifier;
    this._dependencies = new Set<string>();
    this.rootClass = new BlockClass(ROOT_CLASS, this);
    this.stylesheet = stylesheet;
    this.guid = guid;

    this.addClass(this.rootClass);
  }

  protected get ChildConstructor(): typeof BlockClass { return BlockClass; }

  /** @returns This Block's self-proclaimed name. */
  public get name(): string { return this.uid; }

  /**
   * Sets `name` value of this `Block`. Block names may change depending on the
   * value passed to its `block-name` property in `:scope`.
   * @prop  name  string  The new uid for this `Block`.
   */
  public setName(name: string): void {
    if (this.hasHadNameReset) { throw new CssBlockError("Cannot set block name more than once."); }
    this._token = name;
    this.hasHadNameReset = true;
  }

  /**
   * Sets the base Block that this Block inherits from.
   * @prop  base  Block  The new base Block.
   */
  public setBase(base: Block) {
    this._base = base;
  }

  /**
   * Lookup a sub-block either locally, or on a referenced foreign block.
   * @param reference
   *   A reference to a block object adhering to the following grammar:
   *     reference -> <ident> '.' <sub-reference>  // reference through sub-block <ident>
   *                | <ident>                      // reference to sub-block <ident>
   *                | '.' <class-selector>         // reference to class in this block
   *                | <attr-selector>             // reference to attribute in this block
   *                | '.'                          // reference to this block
   *     sub-reference -> <ident> '.' <sub-reference> // reference through sub-sub-block
   *                    | <object-selector>        // reference to object in sub-block
   *     object-selector -> <block-selector>       // reference to this sub-block
   *                      | <class-selector>       // reference to class in sub-block
   *                      | <attribute-selector>   // reference to attribute in this sub-block
   *     block-selector -> 'root'
   *     class-selector -> <ident>
   *     attribute-selector -> '[' <ident> ']'
   *     ident -> regex:[a-zA-Z_-][a-zA-Z0-9]*
   *   A single dot by itself returns the current block.
   * @returns The Style referenced at the supplied path.
   */
  public lookup(path: string | BlockPath, errLoc?: SourceRange | SourceFile): Styles | undefined {
    path = new BlockPath(path);
    let block = this.getReferencedBlock(path.block);
    if (!block) {
      if (errLoc) { throw new InvalidBlockSyntax(`No Block named "${path.block}" found in scope.`, errLoc); }
      return undefined;
    }
    let klass = block.resolveClass(path.class);
    let attrInfo = path.attribute;
    let attr;
    if (klass && attrInfo) {
      attr = klass.resolveAttributeValue(attrInfo);
      if (!attr) return undefined;
    }

    if (!attr && !klass && errLoc) {
      throw new InvalidBlockSyntax(`No Style "${path.path}" found on Block "${block.name}".`, errLoc);
    }

    return attr || klass || undefined;
  }

    /**
   * Lookup a sub-block either locally, or on a exported foreign block.
   * @param reference
   *   A reference to a block object adhering to the following grammar:
   *     reference -> <ident> '.' <sub-reference>  // reference through sub-block <ident>
   *                | <ident>                      // reference to sub-block <ident>
   *                | '.' <class-selector>         // reference to class in this block
   *                | <attr-selector>             // reference to attribute in this block
   *                | '.'                          // reference to this block
   *     sub-reference -> <ident> '.' <sub-reference> // reference through sub-sub-block
   *                    | <object-selector>        // reference to object in sub-block
   *     object-selector -> <block-selector>       // reference to this sub-block
   *                      | <class-selector>       // reference to class in sub-block
   *                      | <attribute-selector>   // reference to attribute in this sub-block
   *     block-selector -> 'root'
   *     class-selector -> <ident>
   *     attribute-selector -> '[' <ident> ']'
   *     ident -> regex:[a-zA-Z_-][a-zA-Z0-9]*
   *   A single dot by itself returns the current block.
   * @returns The Style referenced at the supplied path.
   */
  public externalLookup(path: string | BlockPath, errLoc?: SourceRange | SourceFile): Styles | undefined {
    path = new BlockPath(path);
    let block = this.getExportedBlock(path.block);
    if (!block) {
      if (errLoc) { throw new InvalidBlockSyntax(`No Block named "${path.block}" found in scope.`, errLoc); }
      return undefined;
    }
    let klass = block.resolveClass(path.class);
    let attrInfo = path.attribute;
    let attr;
    if (klass && attrInfo) {
      attr = klass.resolveAttributeValue(attrInfo);
      if (!attr) return undefined;
    }

    if (!attr && !klass && errLoc) {
      throw new InvalidBlockSyntax(`No Style "${path.path}" found on Block "${block.name}".`, errLoc);
    }

    return attr || klass || undefined;
  }

  /**
   * Stores a block error along with the block
   * @param error CssBlockError that is added to the block
   */
  addError(error: CssBlockError) {
    this._blockErrors.push(error);
  }

  /**
   * Checks for errors on the block
   * @returns true if the block is valid else throws the errors on the block
   */
  assertValid(): Block {
    if (this._blockErrors.length > 1) {
      throw new MultipleCssBlockErrors(this._blockErrors);
    } else if (this._blockErrors.length === 1) {
      throw this._blockErrors[0];
    }
    return this;
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

  get identifier(): FileIdentifier {
    return this._identifier;
  }

  getClass(name: string): BlockClass | null { return name ? this.getChild(name) : this.getChild(ROOT_CLASS); }
  resolveClass(name: string): BlockClass | null { return name ? this.resolveChild(name) : this.resolveChild(ROOT_CLASS); }

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

  eachBlockReference(callback: (name: string, block: Block) => unknown) {
    for (let name of Object.keys(this._blockReferences)) {
      callback(name, this._blockReferences[name]);
    }
  }

  /**
   * Add a Block reference accessible internally to the block as `localName`.
   * @param localName  The name to expose this block internally as.
   * @param block  The block to expose internally.
   */
  addBlockReference(localName: string, block: Block) {
    this._blockReferences[localName] = block;
    this._blockReferencesReverseLookup.set(block, localName);
  }

  /**
   * Get an imported Block at name `localName`.
   * @param localName  The local name name of the requested imported block.
   * @returns Block | null.
   */
  getReferencedBlock(localName: string): Block | null {
    if (localName === DEFAULT_EXPORT) { return this; }
    return this._blockReferences[localName] || null;
  }

  /**
   * Reverse imported Block lookup. Given a Block, return its private local alias.
   * @param block  The requested Block to lookup.
   * @returns string | null.
   */
  getReferencedBlockLocalName(block: Block | undefined): string | null {
    return block && this._blockReferencesReverseLookup.get(block) || null;
  }

  /**
   * Add a Block export to be exposed to importers at name `remoteName`.
   * @param remoteName  The name to expose this block publicly as.
   * @param block  The block to expose publicly.
   */
  addBlockExport(remoteName: string, block: Block) {
    this._blockExports[remoteName] = block;
    this._blockExportReverseLookup.set(block, remoteName);
  }

  /**
   * Iterates over each exported block, applying the callback to it
   * @param callback the function to iterate over each exported block
   */
  eachBlockExport(callback: (name: string, block: Block) => unknown) {
    for (let name of Object.keys(this._blockExports)) {
      callback(name, this._blockExports[name]);
    }
  }

  /**
   * Get an exported Block at name `remoteName`.
   * @param remoteName  The public name of the requested exported block.
   * @returns Block | null.
   */
  getExportedBlock(remoteName: string): Block | null {
    return this._blockExports[remoteName] || null;
  }

  /**
   * Reverse exported Block lookup. Given a Block, return its publicly exported name.
   * @param block  The requested Block to lookup.
   * @returns string | null.
   */
  getExportedBlockRemoteName(block: Block | undefined): string | null {
    return block && this._blockExportReverseLookup.get(block) || null;
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

  /**
   * Fetch a dictionary of styles associated with this block, using any preset
   * selector as the key. If a given style doesn't have a preset selector, it
   * will be excluded from this dictionary.
   *
   * @param shallow - Pass true to exclude inherited objects.
   * @returns Collection of Styles objects, organized by preset selector value.
   */
  compiledClassesMap(shallow?: boolean): ObjectDictionary<Styles> {
    const result = {};
    const all = this.all(shallow);

    all.forEach(el => {
      const presetCssClass = el.presetCssClass;
      if (presetCssClass) {
        result[presetCssClass] = el;
      }
    });

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
   * Return all the style aliases defined on the block.
   * @returns Array of style aliases.
   */
  getAllStyleAliases(): Set<string> {
    let result = new Set<string>();
    for (let blockClass of this.classes) {
      // add aliases on the block class
      blockClass.getStyleAliases().forEach(alias => result.add(alias));
      // add aliases for each of the state attributes within the block class
      blockClass.allAttributeValues().forEach(value => value.getStyleAliases().forEach(alias => result.add(alias)));
    }
    return result;
  }

  nodeAsStyle(node: selectorParser.Node): [Styles, number] | null {
    let next = node.next();
    if (isRootNode(node) && next && isAttributeNode(next) && typeof next.namespace === "string") {
      let otherBlock = this.getReferencedBlock(next.namespace);
      if (otherBlock) {
        if (next && isClassNode(next)) {
          let klass = otherBlock.getClass(next.value);
          if (klass) {
            let another = next.next();
            if (another && isAttributeNode(another)) {
              let attr = klass.getAttributeValue(toAttrToken(another));
              if (attr) {
                return [attr, 2];
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
        } else if (next && isAttributeNode(next)) {
          let attr = otherBlock.rootClass.getAttributeValue(toAttrToken(next));
          if (attr) {
            return [attr, 1];
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else if (selectorParser.isClassName(node) || isRootNode(node)) {
      let klass = this.getClass(node.value);
      if (klass === null) { return null; }
      let next = node.next();
      if (next && isAttributeNode(next)) {
        let attr = klass.getAttributeValue(toAttrToken(next));
        if (attr === null) {
          return null;
        } else {
          return [attr, 1];
        }
      } else {
        return [klass, 0];
      }
    } else if (isAttributeNode(node)) {
      let attr = this.rootClass.ensureAttributeValue(toAttrToken(node));
      if (attr) {
        return [attr, 0];
      } else {
        return null;
      }
    }
    return null;
  }

  rewriteSelectorNodes(nodes: selectorParser.Node[], config: ResolvedConfiguration, reservedClassNames: Set<string>): selectorParser.Node[] {
    let newNodes: selectorParser.Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      let result = this.nodeAsStyle(node);
      if (result === null) {
        newNodes.push(node);
      } else {
        newNodes.push(selectorParser.className({ value: result[0].cssClass(config, reservedClassNames)}));
        i += result[1];
      }
    }
    return newNodes;
  }

  rewriteSelectorToString(selector: ParsedSelector, config: ResolvedConfiguration, reservedClassNames: Set<string>): string {
    let firstNewSelector = new CompoundSelector();
    let newSelector = firstNewSelector;
    let newCurrentSelector = newSelector;
    let currentSelector: CompoundSelector | undefined = selector.selector;
    do {
      newCurrentSelector.nodes = this.rewriteSelectorNodes(currentSelector.nodes, config, reservedClassNames);
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

  rewriteSelector(selector: ParsedSelector, config: ResolvedConfiguration, reservedClassNames: Set<string>): ParsedSelector {
    // generating a string and re-parsing ensures the internal structure is consistent
    // otherwise the parent/next/prev relationships will be wonky with the new nodes.
    let s = this.rewriteSelectorToString(selector, config, reservedClassNames);
    return parseSelector(s)[0];
  }

  debug(config: ResolvedConfiguration): string[] {
    let result: string[] = [`Source: ${this.identifier}`];

    // Log Root Class and all children first at root level.
    // NOTE: debug statements don't take into account the reservedClassNames as
    // debug happens during parse and we can only get the entire list of
    // reservedClassNames once block parsing is complete
    const classes = [...this.rootClass.cssClasses(config, new Set())].join(".");
    const aliases = this.rootClass.getStyleAliases();

    result.push(`${ROOT_CLASS} (.${classes}${aliases.size ? `, aliases: .${[...aliases].join(" .")}` : ""})`, ...this.rootClass.debug(config));

    // Log all BlockClasses and children at second level.
    let sourceNames = new Set<string>(this.resolveChildren().map(s => s.asSource()));
    let sortedNames = [...sourceNames].sort().filter((n) => n !== ROOT_CLASS);
    for (let n of sortedNames) {
      const isLast = sortedNames.indexOf(n) === sortedNames.length - 1;
      let o = this.find(n) as BlockClass;
      result.push(` ${isLast ? "└──"  : "├──"} ${o.asDebug(config)}`);
      const childrenDebugs = o.debug(config).map((s) => ` ${isLast ? " " : "|"}   ${s}`);
      result.push(...childrenDebugs);
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
    return this._token;
  }
}

export function isBlock(o?: object): o is Block {
  return o instanceof Block;
}
