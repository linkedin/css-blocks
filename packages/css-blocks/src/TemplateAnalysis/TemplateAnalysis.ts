// tslint:disable-next-line:no-unused-variable Imported for Documentation link
import {
  isSourcePosition,
  POSITION_UNKNOWN,
  SourceLocation,
  SourcePosition,
} from "@opticss/element-analysis";
import {
  SerializedTemplateInfo,
  TemplateAnalysis as OptimizationTemplateAnalysis,
  TemplateInfo,
  TemplateInfoFactory,
  TemplateIntegrationOptions,
  TemplateTypes,
} from "@opticss/template-api";
import {
  ObjectDictionary,
  objectValues,
} from "@opticss/util";
import { IdentGenerator } from "opticss";

import { Block, Style } from "../Block";
import { BlockFactory } from "../BlockParser";
import { ReadonlyOptions } from "../options";

import { ElementAnalysis, SerializedElementAnalysis } from "./ElementAnalysis";
import { StyleAnalysis } from "./StyleAnalysis";
import { TemplateValidator, TemplateValidatorOptions } from "./validations";

/**
 * This interface defines a JSON friendly serialization
 * of a {TemplateAnalysis}.
 */
export interface SerializedTemplateAnalysis<K extends keyof TemplateTypes> {
  template: SerializedTemplateInfo<K>;
  blocks: ObjectDictionary<string>;
  stylesFound: string[];
  // The numbers stored in each element are an index into a stylesFound;
  elements: ObjectDictionary<SerializedElementAnalysis>;
}

/**
 * A TemplateAnalysis performs book keeping and ensures internal consistency of the block objects referenced
 * within a template. It is designed to be used as part of an AST walk over a template.
 *
 * 1. Call [[startElement startElement()]] at the beginning of an new html element.
 * 2. Call [[addStyle addStyle(style, isDynamic)]] for all the styles used on the current html element.
 * 2. Call [[addExclusiveStyle addExclusiveStyle(alwaysPresent, ...style)]] for all the styles used that are mutually exclusive on the current html element.
 * 3. Call [[endElement endElement()]] when done adding styles for the current element.
 */
export class TemplateAnalysis<K extends keyof TemplateTypes> implements StyleAnalysis {

  template: TemplateInfo<K>;
  idGenerator: IdentGenerator;

  /**
   * A map from a local name for the block to the [[Block]].
   * The local name must be a legal CSS ident/class name but this is not validated here.
   * See [[CLASS_NAME_IDENT]] for help validating a legal class name.
   */
  blocks: ObjectDictionary<Block>;

  /**
   * Return the number of blocks discovered in this Template.
   */
  blockCount(): number {
    return Object.keys(this.blocks).length;
  }

  /**
   * Return the number of styles discovered in this Analysis' Template.
   * This is slow.
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
   * A per-element correlation of styles used. The current correlation is added
   * to this list when [[endElement]] is called.
   */
  // tslint:disable-next-line:prefer-whatever-to-any
  elements: Map<string, ElementAnalysis<any, any, any>>;

  /**
   * The current element, created when calling [[startElement]].
   * The current element is unset after calling [[endElement]].
   */
  // tslint:disable-next-line:prefer-whatever-to-any
  currentElement: ElementAnalysis<any, any, any> | undefined;

  /**
   * Return the number of elements discovered in this Analysis.
   */
  elementCount(): number {
    return this.elements.size;
  }

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

  optimizationOptions(): TemplateIntegrationOptions {
    // TODO: take this as an argument from the template integration.
    return {
      rewriteIdents: {
        id: false,
        class: true,
        omitIdents: {
          id: [],
          class: [],
        },
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }

  /**
   * Get an Element by ID.
   */
  getElementById<BooleanExpression, StringExpression, TernaryExpression>(id: string): ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> | undefined {
    return this.elements.get(id);
  }

  /**
   * Template validator instance to verify blocks applied to an element.
   */
  validator: TemplateValidator;

  /**
   * @param template The template being analyzed.
   */
  constructor(template: TemplateInfo<K>, options?: TemplateValidatorOptions) {
    this.idGenerator = new IdentGenerator();
    this.template = template;
    this.blocks = {};
    this.elements = new Map();
    this.validator = new TemplateValidator(options);
  }

  /**
   * @param block The block for which the local name should be returned.
   * @return The local name of the given block.
   */
  getBlockName(block: Block): string | null {
    let names = Object.keys(this.blocks);
    for (let name of names) {
      if (this.blocks[name] === block) {
        return name;
      }
    }
    for (let name of names) {
      let superBlock = this.blocks[name].base;
      while (superBlock) {
        if (superBlock === block) return name;
        superBlock = superBlock.base;
      }
    }
    return null;
  }

  startElement<BooleanExpression, StringExpression, TernaryExpression>(location: SourceLocation | SourcePosition, tagName?: string): ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> {
    if (isSourcePosition(location)) {
      location = {start: location};
    }
    if (this.currentElement) {
      throw new Error("Internal Error: failure to call endElement before previous call to startElement.");
    }
    this.currentElement = new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(location, tagName, this.idGenerator.nextIdent());
    return this.currentElement;
  }

  endElement<BooleanExpression, StringExpression, TernaryExpression>(element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>, endPosition?: SourcePosition) {
    if (this.currentElement !== element) {
      throw new Error("Element is not the current element.");
    }
    if (endPosition) {
      element.sourceLocation.end = endPosition;
    }
    this.addElement(element);
    this.currentElement = undefined;
  }

  private addFilename(pos: SourcePosition | undefined) {
    if (pos && !pos.filename) {
      pos.filename = this.template.identifier;
    }
  }

  addElement<BooleanExpression, StringExpression, TernaryExpression>(element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>) {
    if (!element.id) {
      element.id = this.idGenerator.nextIdent();
    }
    if (this.elements.get(element.id)) {
      throw new Error(`Internal Error: an element with id = ${element.id} already exists in this analysis`);
    }
    this.addFilename(element.sourceLocation.start);
    this.addFilename(element.sourceLocation.end);
    if (!element.sealed) {
      element.seal();
    }
    this.validator.validate(this, element);
    this.elements.set(element.id, element);
  }

  /**
   * @return The local name for the block object using the local prefix for the block.
   */
  serializedName(o: Style): string {
    return `${this.getBlockName(o.block) || ""}${o.asSource()}`;
  }

  /**
   * All the blocks referenced by this analysis.
   */
  referencedBlocks(): Block[] {
    return objectValues(this.blocks);
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

  /**
   * Generates a [[SerializedTemplateAnalysis]] for this analysis.
   */
  serialize(): SerializedTemplateAnalysis<K> {
    let blocks = {};
    let stylesFound: string[] = [];
    let elements: ObjectDictionary<SerializedElementAnalysis> = {};
    let template = this.template.serialize();
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
    Object.keys(this.blocks).forEach((localname) => {
      blocks[localname] = this.blocks[localname].identifier;
    });

    // Serialize all discovered Elements.
    this.elements.forEach((el, key) => {
      elements[key] = el.serialize(styleIndexes);
    });

    let t: SerializedTemplateInfo<K> = template;
    // Return serialized Analysis object.
    return { template: t, blocks, stylesFound, elements };
  }

  /**
   * Creates a TemplateAnalysis from its serialized form.
   * @param serializedAnalysis The analysis to be recreated.
   * @param options The plugin options that are used to parse the blocks.
   * @param postcssImpl The instance of postcss that should be used to parse the block's css.
   */
  static deserialize<K extends keyof TemplateTypes>(
    serializedAnalysis: SerializedTemplateAnalysis<K>,
    blockFactory: BlockFactory,
  ): Promise<TemplateAnalysis<K>> {
    let blockNames = Object.keys(serializedAnalysis.blocks);
    let info = TemplateInfoFactory.deserialize<K>(serializedAnalysis.template);
    let analysis = new TemplateAnalysis(info);
    let blockPromises = new Array<Promise<{name: string; block: Block}>>();
    blockNames.forEach(n => {
      let blockIdentifier = serializedAnalysis.blocks[n];
      let promise = blockFactory.getBlock(blockIdentifier).then(block => {
        return {name: n, block: block};
      });
      blockPromises.push(promise);
    });
    return Promise.all(blockPromises).then(values => {

      // Create a temporary block so we can take advantage of `Block.lookup`
      // to easily resolve all BlockPaths referenced in the serialized analysis.
      // TODO: We may want to abstract this so we're not making a temporary block.
      let localScope = new Block("analysis-block", "tmp");
      values.forEach(o => {
        analysis.blocks[o.name] = o.block;
        localScope.addBlockReference(o.name, o.block);
      });
      let objects = new Array<Style>();
      serializedAnalysis.stylesFound.forEach(s => {
        let style = localScope.lookup(s);
        if (style) {
          objects.push(style);
        } else {
          throw new Error(`Cannot resolve ${s} to a block style.`);
        }
      });

      let elementNames = Object.keys(serializedAnalysis.elements);
      elementNames.forEach((elID) => {
        let data = serializedAnalysis.elements[elID];
        let element = new ElementAnalysis<null, null, null>(data.sourceLocation || {start: POSITION_UNKNOWN}, undefined, elID);
        analysis.elements.set(elID, element);
      });

      // tslint:disable-next-line:prefer-whatever-to-any
      return <TemplateAnalysis<K>> <any> analysis;
    });
  }

  forOptimizer(opts: ReadonlyOptions): OptimizationTemplateAnalysis<K> {
    let optAnalysis = new OptimizationTemplateAnalysis<K>(this.template);
    for (let element of this.elements.values()) {
      let result = element.forOptimizer(opts);
      optAnalysis.elements.push(result[0]);
    }
    return optAnalysis;
  }
}
