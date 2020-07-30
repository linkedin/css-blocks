// tslint:disable-next-line:no-unused-variable Imported for Documentation link
import {
  POSITION_UNKNOWN,
  SourceLocation,
  SourcePosition,
  isSourcePosition,
} from "@opticss/element-analysis";
import {
  SerializedTemplateInfo,
  TemplateAnalysis as OptimizationTemplateAnalysis,
  TemplateInfoFactory,
  TemplateTypes,
} from "@opticss/template-api";
import { ObjectDictionary, objectValues } from "@opticss/util";
import { IdentGenerator } from "opticss";

import { BlockFactory } from "../BlockParser";
import { AttrValue, Block, BlockClass, Style } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";
import { allDone } from "../util";

import { Analyzer } from "./Analyzer";
import { ElementAnalysis, SerializedElementAnalysis, SerializedElementSourceAnalysis } from "./ElementAnalysis";
import { TemplateValidator, TemplateValidatorOptions } from "./validations";

/**
 * This interface defines a JSON friendly serialization
 * of an {Analysis}.
 */
export interface SerializedAnalysis<K extends keyof TemplateTypes> {
  template: SerializedTemplateInfo<K>;
  blocks: ObjectDictionary<string>;
  stylesFound: string[];
  // The numbers stored in each element are an index into a stylesFound;
  elements: ObjectDictionary<SerializedElementAnalysis>;
}

/**
 * This interface defines a JSON friendly serialization
 * of an {Analysis}.
 */
export interface SerializedSourceAnalysis<K extends keyof TemplateTypes> {
  template: SerializedTemplateInfo<K>;
  blocks: ObjectDictionary<string>;
  stylesFound: string[];
  // The numbers stored in each element are an index into a stylesFound;
  elements: ObjectDictionary<SerializedElementSourceAnalysis>;
}

// tslint:disable-next-line:prefer-unknown-to-any
type ElementAnalyzedCallback<BooleanExpression, StringExpression, TernaryExpression> = (element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>) => void;

/**
 * An Analysis performs book keeping and ensures internal consistency of the block objects referenced
 * within a single template. It is designed to be used as part of an AST walk over a template.
 *
 * 1. Call [[startElement startElement()]] at the beginning of an new html element.
 * 2. Call [[addStyle addStyle(style, isDynamic)]] for all the styles used on the current html element.
 * 2. Call [[addExclusiveStyle addExclusiveStyle(alwaysPresent, ...style)]] for all the styles used that are mutually exclusive on the current html element.
 * 3. Call [[endElement endElement()]] when done adding styles for the current element.
 */
export class Analysis<K extends keyof TemplateTypes> {

  idGenerator: IdentGenerator;
  template: TemplateTypes[K];

  /**
   * A per-element correlation of styles used. The current correlation is added
   * to this list when [[endElement]] is called.
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  elements: Map<string, ElementAnalysis<any, any, any>>;

  /**
   * A map from a local name for the block to the [[Block]].
   * The local name must be a legal CSS ident/class name but this is not validated here.
   * See [[CLASS_NAME_IDENT]] for help validating a legal class name.
   */
  private blocks: ObjectDictionary<Block>;

  /**
   * The current element, created when calling [[startElement]].
   * The current element is unset after calling [[endElement]].
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  private currentElement: ElementAnalysis<any, any, any> | undefined;

  /**
   * Template validator instance to verify blocks applied to an element.
   */
  private validator: TemplateValidator;

  /**
   * Callback when an element is done being analyzed.
   * The element analysis will be sealed.
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  onElementAnalyzed?: ElementAnalyzedCallback<any, any, any>;

  /**
   * @param template The template being analyzed.
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  constructor(template: TemplateTypes[K], options?: TemplateValidatorOptions, onElementAnalyzed?: ElementAnalyzedCallback<any, any, any>) {
    this.idGenerator = new IdentGenerator();
    this.template = template;
    this.blocks = {};
    this.elements = new Map();
    this.validator = new TemplateValidator(options);
    this.onElementAnalyzed = onElementAnalyzed;
  }

  /**
   * Return the number of blocks discovered in this Template.
  */
  blockCount(): number { return Object.keys(this.blocks).length; }

  /**
   * Convenience setter for adding a block to the template scope.
   */
  addBlock(name: string, block: Block): Block { return this.blocks[name] = block; }

  /**
   * Convenience getter for fetching a block from the template scope.
   */
  getBlock(name: string): Block | undefined { return this.blocks[name]; }

  /**
   * Return the number of elements discovered in this Analysis.
   */
  elementCount(): number { return this.elements.size; }

  /**
   * Get the nth element discovered in this Analysis.
   */
  getElement<BooleanExpression, StringExpression, TernaryExpression>(idx: number): ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
    let mapIter = this.elements.entries();
    let el = mapIter.next().value;
    for (let i = 0; i < idx; i++) {
      el = mapIter.next().value;
    }
    return el[1];
  }

  /**
   * Return the number of styles discovered in this Analysis' Template.
   * TODO: This is slow. We can pre-compute this as elements are added.
   */
  styleCount(): number {
    let c = 0;
    for (let el of this.elements.values()) {
      for (let _s of el.attributesFound()) {
        c++;
      }
      for (let _s of el.classesFound()) {
        c++;
      }
    }
    return c;
  }

  /**
   * Get an Element by ID.
   */
  getElementById<BooleanExpression, StringExpression, TernaryExpression>(id: string): ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> | undefined {
    return this.elements.get(id);
  }

  /**
   * Returns the local name of the provided in this Analysis' template.
   * @param block The block for which the local name should be returned.
   * @return The local name of the given block.
   */
  getBlockName(block: Block): string | null {
    for (let name of Object.keys(this.blocks)) {
      let searchBlock = this.blocks[name];
      let blockName = this._searchForBlock(block, searchBlock, name);
      if (blockName !== null) {
        return blockName;
      }
    }
    return null;
  }

  _searchForBlock(blockToFind: Block, block: Block, parentPath: string): string | null {
    if (block === blockToFind) {
      return parentPath;
    }

    // we collect these name/block pairs first, so we can early exit the next loop.
    let blockRefs = new Array<[string, Block]>();
    block.eachBlockReference((name, refBlock) => {
      blockRefs.push([name, refBlock]);
    });

    for (let [name, refBlock] of blockRefs) {
      let currentSearchPath = `${parentPath}>${name}`;
      let rv = this._searchForBlock(blockToFind, refBlock, currentSearchPath);
      if (rv !== null) {
        return rv;
      }
    }

    return null;
  }

  /**
   * Get a new {ElementAnalysis} object to track an individual element's {Style}
   * consumption in this {Analysis}' template. Every {ElementAnalysis} returned from
   * `Analysis.startElement` must be passed to `Analysis.endElement` before startElement
   * is called again.
   * @param location  The {SourceLocation} of this element in the template.
   * @param tagName  Optional. The tag name of the element being represented by this {ElementAnalysis}.
   * @returns A new {ElementAnalysis}.
   */
  startElement<BooleanExpression, StringExpression, TernaryExpression>(location: SourceLocation | SourcePosition, tagName?: string): ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
    if (isSourcePosition(location)) { location = {start: location}; }
    if (this.currentElement) {
      throw new Error("Internal Error: failure to call endElement before previous call to startElement.");
    }
    this.currentElement = new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(location, this.reservedClassNames(), tagName, this.idGenerator.nextIdent());
    return this.currentElement;
  }

  /**
   * Finish an {ElementAnalysis} object returned from `Analysis.startElement` to
   * the end location in source and save {Style} usage on the parent {Analysis}.
   * @param element  The {ElementAnalysis} we are finishing.
   * @param endPosition  Optional. The location in code where this element tag is closed..
   */
  endElement<BooleanExpression, StringExpression, TernaryExpression>(element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>, endPosition?: SourcePosition): void {
    if (this.currentElement !== element) {
      throw new Error("Element is not the current element.");
    }
    if (endPosition) { element.sourceLocation.end = endPosition; }
    if (!element.id) { element.id = this.idGenerator.nextIdent(); }
    if (this.elements.get(element.id)) {
      throw new Error(`Internal Error: an element with id = ${element.id} already exists in this analysis`);
    }
    this.ensureFilename(element.sourceLocation.start);
    this.ensureFilename(element.sourceLocation.end);
    if (!element.sealed) { element.seal(); }
    this.validator.validate(this, element);
    this.elements.set(element.id, element);
    if (this.onElementAnalyzed) {
      this.onElementAnalyzed(element);
    }
    this.currentElement = undefined;
  }

  /**
   * Given a {SourcePosition}, ensure that the file name is present. If not,
   * add the template identifier.
   * @param post  The {SourcePosition} we are validating.
   */
  private ensureFilename(pos: SourcePosition | undefined) {
    if (pos && !pos.filename) {
      pos.filename = this.template.identifier;
    }
  }

  /**
   * @return The local name for the block object using the local prefix for the block.
   */
  serializedName(o: Style): string {
    let blockName = this.getBlockName(o.block);
    if (blockName === null) {
      throw new Error(`Block ${o.block.identifier} is not registered in the dependency graph for this analysis.`);
    }
    return `${blockName}${o.asSource()}`;
  }

  /**
   * All the blocks referenced by this analysis.
   */
  referencedBlocks(): Block[] {
    return objectValues(this.blocks);
  }

  /**
   * For now, returns all aliases referenced by this block and all the blocks they
   * reference recursively. We can add more to this set in future
   */
  reservedClassNames(): Set<string> {
    let aliases = new Set<string>();
    let blocks = this.transitiveBlockDependencies();
    blocks.forEach(block => {
      block.getAllStyleAliases().forEach(alias => aliases.add(alias));
    });
    return aliases;
  }

  /**
   * All the blocks referenced by this block and all the blocks they reference recursively.
   */
  transitiveBlockDependencies(): Set<Block> {
    let deps = new Set<Block>();
    this.referencedBlocks().forEach((block) => {
      deps.add(block);
      let moreDeps = block.transitiveBlockDependencies();
      if (moreDeps.size > 0) {
        deps = new Set([...deps, ...moreDeps]);
      }
    });
    return deps;
  }

  /**
   * All bhe blocks this block depends on. Same as referenced blocks except for the return type.
   */
  blockDependencies(): Set<Block> {
    return new Set<Block>(this.referencedBlocks());
  }

  *stylesFound(dynamic?: boolean): IterableIterator<Style> {
    let found = new Set<Style>();
    for (let el of this.elements.values()) {
      for (let s of el.classesFound(dynamic)) {
        if (found.has(s)) continue;
        found.add(s);
        yield s;
      }
      for (let s of el.attributesFound(dynamic)) {
        if (found.has(s)) continue;
        found.add(s);
        yield s;
      }
    }
  }

  serializeSource(blockPaths?: Map<Block, string>): SerializedSourceAnalysis<K> {
    let elements: ObjectDictionary<SerializedElementSourceAnalysis> = {};
    let { template, blocks, stylesFound, styleIndexes } = this._serializeSetup(blockPaths);

    // Serialize all discovered Elements.
    this.elements.forEach((el, key) => {
      elements[key] = el.serializeSourceAnalysis(styleIndexes);
    });

    // Return serialized Analysis object.
    return { template, blocks, stylesFound, elements };
  }

  /**
   * Generates a [[SerializedTemplateAnalysis]] for this analysis.
   */
  serialize(blockPaths?: Map<Block, string>): SerializedAnalysis<K> {
    let elements: ObjectDictionary<SerializedElementAnalysis> = {};
    let { template, blocks, stylesFound, styleIndexes } = this._serializeSetup(blockPaths);

    // Serialize all discovered Elements.
    this.elements.forEach((el, key) => {
      elements[key] = el.serialize(styleIndexes);
    });

    // Return serialized Analysis object.
    return { template, blocks, stylesFound, elements };
  }

  _serializeSetup(blockPaths?: Map<Block, string>) {
    let blocks = {};
    let stylesFound: string[] = [];
    let template = this.template.serialize() as SerializedTemplateInfo<K>;
    let styleNameMap = new Map<Style, string>();
    let styleIndexes = new Map<Style, number>();

    let styles = [...this.stylesFound()];

    for (let found of styles) {
      styleNameMap.set(found, this.serializedName(found));
    }

    // Sort our found styles into an array.
    styles.sort((a, b) => {
      return styleNameMap.get(a)! > styleNameMap.get(b)! ? 1 : -1;
    });

    styles.forEach((s, idx) => {
      stylesFound.push(styleNameMap.get(s)!);
      styleIndexes.set(s, idx);
    });

    // Serialize our blocks to a map of their local names.
    Object.keys(this.blocks).forEach((localName) => {
      let block = this.blocks[localName];
      blocks[localName] = blockPaths && blockPaths.get(block) || block.identifier;
    });
    return { template, blocks, stylesFound, styleIndexes };
  }

  /**
   * Creates a TemplateAnalysis from its serialized form.
   * @param serializedAnalysis The analysis to be recreated.
   * @param blockFactory for loading blocks referenced in the serialization.
   * @param parent The analyzer this analysis will belong to.
   */
  static async deserializeSource (
    serializedAnalysis: SerializedSourceAnalysis<keyof TemplateTypes>,
    blockFactory: BlockFactory,
    parent: Analyzer<keyof TemplateTypes>,
  ): Promise<Analysis<keyof TemplateTypes>> {
    let blockNames = Object.keys(serializedAnalysis.blocks);
    let info = TemplateInfoFactory.deserialize<keyof TemplateTypes>(serializedAnalysis.template);
    let analysis = parent.newAnalysis(info);
    let blockPromises = new Array<Promise<{name: string; block: Block}>>();
    blockNames.forEach(n => {
      let blockIdentifier = serializedAnalysis.blocks[n];
      let promise = blockFactory.getBlock(blockIdentifier).then(block => {
        return {name: n, block: block};
      });
      blockPromises.push(promise);
    });
    let values = await allDone(blockPromises);

    // Create a temporary block so we can take advantage of `Block.lookup`
    // to easily resolve all BlockPaths referenced in the serialized analysis.
    // TODO: We may want to abstract this so we're not making a temporary block.
    let localScope = new Block("analysis-block", "tmp", "analysis-block");
    values.forEach(o => {
      analysis.blocks[o.name] = o.block;
      localScope.addBlockReference(o.name, o.block);
    });

    // We lookup each style by its serialized reference.
    // The index into the array is used elsewhere in this
    // serialized form to reference these styles.
    let styles = new Array<Style>();
    serializedAnalysis.stylesFound.forEach(s => {
      let style = localScope.find(s);
      if (style) {
        styles.push(style);
      } else {
        throw new Error(`Cannot resolve ${s} to a block style.`);
      }
    });

    // These are convenience accessors into the styles array that perform
    // bounds and type checking assertions.
    let styleRef = (index: number) => {
      let s = styles[index];
      if (!s) {
        throw new Error("[internal error] Style index out of bounds!");
      }
      return s;
    };

    let classRef = (index: number) => {
      let s = styleRef(index);
      if (!(s instanceof BlockClass)) {
        throw new Error("[internal error] Block class expected.");
      }
      return s;
    };

    let attrValueRef = (index: number) => {
      let s = styleRef(index);
      if (!(s instanceof AttrValue)) {
        throw new Error("[internal error] attribute value expected.");
      }
      return s;
    };

    let elementNames = Object.keys(serializedAnalysis.elements);
    elementNames.forEach((elID) => {
      let data = serializedAnalysis.elements[elID];
      let element = new ElementAnalysis<null, null, null>(data.sourceLocation || {start: POSITION_UNKNOWN}, parent.reservedClassNames(), data.tagName, elID);
      for (let analyzedStyle of data.analyzedStyles) {
        ElementAnalysis.deserializeAnalyzedStyle(element, analyzedStyle, styleRef, classRef, attrValueRef);
      }
      element.seal();
      analysis.elements.set(elID, element);
      if(analysis.onElementAnalyzed) analysis.onElementAnalyzed(element);
    });

    return analysis;
  }

  // XXX `deserialize` doesn't actually deserialize the elements in the
  // XXX serialized form. Thankfully, this method is never used.
  // TODO: Get rid of this serialized form and use the "source serialization"
  // TODO: as the only serialization because it's a better format for serializing
  // TODO: this data.
  /**
   * Creates a TemplateAnalysis from its serialized form.
   *
   * **DO NOT USE THIS METHOD, ITS NOT FULLY IMPLEMENTED.**
   * @param serializedAnalysis The analysis to be recreated.
   * @param blockFactory for loading blocks referenced in the serialization.
   * @param parent The analyzer this analysis will belong to.
   */
  static async deserialize (
    serializedAnalysis: SerializedAnalysis<keyof TemplateTypes>,
    blockFactory: BlockFactory,
    parent: Analyzer<keyof TemplateTypes>,
  ): Promise<Analysis<keyof TemplateTypes>> {
    let blockNames = Object.keys(serializedAnalysis.blocks);
    let info = TemplateInfoFactory.deserialize<keyof TemplateTypes>(serializedAnalysis.template);
    let analysis = parent.newAnalysis(info);
    let blockPromises = new Array<Promise<{name: string; block: Block}>>();
    blockNames.forEach(n => {
      let blockIdentifier = serializedAnalysis.blocks[n];
      let promise = blockFactory.getBlock(blockIdentifier).then(block => {
        return {name: n, block: block};
      });
      blockPromises.push(promise);
    });
    let values = await allDone(blockPromises);

    // Create a temporary block so we can take advantage of `Block.lookup`
    // to easily resolve all BlockPaths referenced in the serialized analysis.
    // TODO: We may want to abstract this so we're not making a temporary block.
    let localScope = new Block("analysis-block", "tmp", "analysis-block");
    values.forEach(o => {
      analysis.blocks[o.name] = o.block;
      localScope.addBlockReference(o.name, o.block);
    });
    let objects = new Array<Style>();
    serializedAnalysis.stylesFound.forEach(s => {
      let style = localScope.find(s);
      if (style) {
        objects.push(style);
      } else {
        throw new Error(`Cannot resolve ${s} to a block style.`);
      }
    });

    let elementNames = Object.keys(serializedAnalysis.elements);
    elementNames.forEach((elID) => {
      let data = serializedAnalysis.elements[elID];
      let element = new ElementAnalysis<null, null, null>(data.sourceLocation || {start: POSITION_UNKNOWN}, parent.reservedClassNames(), data.tagName, elID);
      element.seal();
      analysis.elements.set(elID, element);
    });

    return analysis;
  }

  forOptimizer(config: ResolvedConfiguration): OptimizationTemplateAnalysis<K> {
    let optAnalysis = new OptimizationTemplateAnalysis<K>(this.template);
    for (let element of this.elements.values()) {
      let result = element.forOptimizer(config);
      optAnalysis.elements.push(result[0]);
    }
    return optAnalysis;
  }
}

export interface IAnalysis<K extends keyof TemplateTypes> extends Analysis<K> {}
