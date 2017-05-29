import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");
import { CssBlockError } from "../errors";
import parseSelector, { ParsedSelector, CompoundSelector } from "../parseSelector";
import { stateParser, isClass, isState, isBlock, NodeAndType, BlockTypes, CLASS_NAME_IDENT } from "../BlockParser";
import { BlockObject, BlockClass } from "./index";
import { OptionsReader } from "../options";
import { OutputMode } from "../OutputMode";
import { Base, StateContainer } from "./Base";

interface BlockReferenceMap {
  [blockName: string]: Block;
}

interface BlockClassMap {
  [className: string]: BlockClass;
}

export interface MergedObjectMap {
  [sourceName: string]: BlockObject[];
}

export class Block extends Base {
  private _classes: BlockClassMap = {};
  private _blockReferences: BlockReferenceMap = {};
  private _source: string;
  private _base?: Block;
  private _baseName?: string;
  private _implements: Block[] = [];

  root?: postcss.Root;

  public readonly states: StateContainer;
  public readonly parsedRuleSelectors: WeakMap<postcss.Rule,ParsedSelector[]>;

  constructor(name: string, source: string) {
    super(name);
    this._source = source;
    this.parsedRuleSelectors = new WeakMap();
    this.states = new StateContainer(this);
  }

  get base(): Block | undefined {
    return this._base;
  }

  get baseName(): string | undefined {
    return this._baseName;
  }

  get source() {
    return this._source;
  }

  /**
   * Blocks can have mutable base names. Expose a setter.
   * TODO: Update external block references on name change, although this
   *       shouldn't happen in regular execution.
   */
  updateName(val: string) {
    this._name = val;
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
        throw new CssBlockError( `Missing implementation${s} for: ${missingObjsStr} from ${b.source}`);
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
        throw "this never happens";
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

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
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

  /**
   * Lookup a sub-block either locally, or on a referenced foreign block.
   * @param reference A reference to a sub-block of the form `(<block-name>.)<sub-block-selector>`
   * @returns The BlockObject referenced at the supplied path.
   */
  lookup(reference: string): BlockObject | undefined {

    // Try to split the reference string to find block name reference. If there
    // is a block name reference, fetch the named block and run lookup in that context.
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

    // Otherwise, find the sub-block locally.
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

  /**
   * Fetch a the cached `BlockObject` from `Block` given `NodeAndType`.
   * @param obj The `NodeAndType` object to use for `BlockObject` lookup.
   */
  nodeAndTypeToBlockObject(obj: NodeAndType): BlockObject | undefined {
    switch (obj.blockType) {
      case BlockTypes.block:
        return this;
      case BlockTypes.state:
        return this.states._getState(stateParser(<selectorParser.Attribute>obj.node));
      case BlockTypes.class:
        return this.getClass(obj.node.value);
      case BlockTypes.classState:
        let classNode = obj.node.prev();
        let classObj = this.getClass(classNode.value);
        if (classObj) {
          return classObj.states._getState(stateParser(<selectorParser.Attribute>obj.node));
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
        } else if (next && isState(next)) {
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
      let klass = this.getClass(node.value);
      if (klass === undefined) {
        return null;
      }
      let next = node.next();
      if (next && isState(next)) {
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
    } else if (isState(node)) {
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
    return parseSelector(this.rewriteSelectorToString(selector, opts))[0];
  }

  matches(compoundSel: CompoundSelector): boolean {
    return compoundSel.nodes.some(node => isBlock(node));
  }

  debug(opts: OptionsReader): string[] {
    let result: string[] = [`Source: ${this.source}`, this.asDebug(opts)];
    result = result.concat(this.states.debug(opts));
    this.classes.forEach((blockClass) => {
      result.push(blockClass.asDebug(opts));
      result = result.concat(blockClass.states.debug(opts));
    });
    return result;
  }

  /**
   * Test if the supplied block is the same block object.
   * @param other  The other Block to test against.
   * @return True or False if self and `other` are equal.
   */
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

  /**
   * Given a PostCSS Rule, ensure it is present in this Block's parsed rule
   * selectors hash, and return the ParsedSelector array.
   * @param rule  PostCSS Rule
   * @return ParsedSelector array
   */
  getParsedSelectors(rule: postcss.Rule): ParsedSelector[] {
    let sels = this.parsedRuleSelectors.get(rule);
    if (!sels) {
      sels = parseSelector(rule.selector);
      this.parsedRuleSelectors.set(rule, sels);
    }
    return sels;
  }
}
