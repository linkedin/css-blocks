/**
 * @module "TemplateAnalysis"
 */
 // tslint:disable-next-line:no-unused-variable Imported for Documentation link
import { OptionsReader } from '../OptionsReader';
import BlockParser, { CLASS_NAME_IDENT } from "../BlockParser";
import { BlockFactory } from "../BlockFactory";
import { CustomLocalScope } from "../util/LocalScope";
import { StyleAnalysis } from "./StyleAnalysis";
import { BlockObject, Block, OBJ_REF_SPLITTER } from "../Block";
import * as errors from '../errors';
import TemplateValidator, { TemplateValidatorOptions } from "./validations";
import {
  TemplateTypes,
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
  TemplateAnalysis as OptimizationTemplateAnalysis,
} from "@opticss/template-api";
import { Element, SerializedElement, StyleMapping } from "./ElementAnalysis";
import { IdentGenerator } from "opticss";

/**
 * This interface defines a JSON friendly serialization
 * of a {TemplateAnalysis}.
 */
export interface SerializedTemplateAnalysis<K extends keyof TemplateTypes> {
  template: SerializedTemplateInfo<K>;
  blocks: {
    [localName: string]: string;
  };
  stylesFound: string[];
  // The numbers stored in each element are an index into a stylesFound;
  elements: { [elementId: string]: SerializedElement };
}

/**
 * A TemplateAnalysis performs book keeping and ensures internal consistency of the block objects referenced
 * within a template. It is designed to be used as part of an AST walk over a template.
 *
 * 1. Call [[startElement startElement()]] at the beginning of an new html element.
 * 2. Call [[addStyle addStyle(blockObject, isDynamic)]] for all the styles used on the current html element.
 * 2. Call [[addExclusiveStyle addExclusiveStyle(alwaysPresent, ...blockObject)]] for all the styles used that are mutually exclusive on the current html element.
 * 3. Call [[endElement endElement()]] when done adding styles for the current element.
 */
export class TemplateAnalysis<K extends keyof TemplateTypes> implements StyleAnalysis {

  template: TemplateInfo<keyof TemplateTypes>;
  idGenerator: IdentGenerator;

  /**
   * A map from a local name for the block to the [[Block]].
   * The local name must be a legal CSS ident/class name but this is not validated here.
   * See [[CLASS_NAME_IDENT]] for help validating a legal class name.
   */
  blocks: {
    [localName: string]: Block;
  };

  /**
   * Return the number of blocks discovered in this Template.
   */
  blockCount(): number {
    return Object.keys(this.blocks).length;
  }

  /**
   * All the block styles used in this template. Due to how Set works, it's exceedingly important
   * that the same instance for the same block object is used over the course of a single template analysis.
   */
  stylesFound: Set<BlockObject>;

  /**
   * Return the number of styles discovered in this Analysis' Template.
   */
  styleCount(): number {
    return this.stylesFound.size;
  }

  /**
   * All the dynamic block styles used in this template. Due to how Set works, it's exceedingly important
   * that the same instance for the same block object is used over the course of a single template analysis.
   */
  dynamicStyles: Set<BlockObject>;

  /**
   * Return the number of dynamic styles discovered in this Analysis' Template.
   */
  dynamicCount(): number {
    return this.dynamicStyles.size;
  }

  /**
   * A per-element correlation of styles used. The current correlation is added
   * to this list when [[endElement]] is called.
   */
  elements: Map<string, Element>;

  /**
   * The current element, created when calling [[startElement]].
   * The current element is unset after calling [[endElement]].
   */
  currentElement: Element | undefined;

  /**
   * Return the number of elements discovered in this Analysis.
   */
  elementCount(): number {
    return this.elements.size;
  }

  /**
   * Get the nth element discovered in this Analysis.
   */
  getElement(idx: number): Element {
    let mapIter = this.elements.entries();
    let el = mapIter.next().value;
    for ( let i = 0; i < idx; i++) {
      el = mapIter.next().value;
    }
    return el[1];
  }

  /**
   * Get an Element by ID.
   */
  getElementById(id: string): Element | undefined {
    return this.elements.get(id);
  }

  /**
   * Template validatior instance to verify blocks applied to an element.
   */
  validator: TemplateValidator;

  /**
   * @param template The template being analyzed.
   */
  constructor(template: TemplateInfo<K>, options: TemplateValidatorOptions = {}) {
    this.idGenerator = new IdentGenerator();
    this.template = template;
    this.blocks = {};
    this.stylesFound = new Set();
    this.dynamicStyles = new Set();
    this.elements = new Map();
    this.validator = new TemplateValidator(options);
  }

  /**
   * @param block The block for which the local name should be returned.
   * @return The local name of the given block.
   */
  getBlockName(block: Block): string | null {
    let names = Object.keys(this.blocks);
    for (let i = 0; i < names.length; i++) {
      if (this.blocks[names[i]] === block) {
        return names[i];
      }
    }
    return null;
  }

  /**
   * Indicates a new element found in a template. no allocations are performed
   * until a style is added so it is safe to call before you know whether there
   * are any styles on the current element. Always call [[endElement]] before
   * calling the next [[startElement]], even if the elements are nested in the
   * document.
   */
  startElement( locInfo: errors.ErrorLocation, id?: string ): string {
    if ( this.currentElement ) {
      throw new errors.CssBlockError(`endElement wasn't called after a previous call to startElement. This is most likely a problem with your css-blocks analyzer library. Please open an issue with that project.`, locInfo);
    }
    this.currentElement = new Element(id || this.idGenerator.nextIdent(), locInfo);
    locInfo.filename = this.template.identifier;
    return this.currentElement.id;
  }

  /**
   * Indicates all styles for the element have been found.
   */
  endElement(): string | undefined {

    let eid: string | undefined;

    if ( !this.currentElement ) {
      return eid;
    }

    this.validator.validate( this.currentElement, this.currentElement.locInfo);

    if ( this.currentElement.stylesFound.size !== 0 ) {
      eid = this.currentElement.id;
      this.elements.set(eid, this.currentElement);
    }

    this.currentElement = undefined;
    return eid;
  }

  /**
   * Generates a [[StyleMapping]] for this analysis.
   */
  getElementStyles( elementId: string ): StyleMapping {
    let element = this.elements.get(elementId);

    if ( !element ) {
      throw new errors.CssBlockError(`Can not find an element with the identifier ${elementId}. This is most likely a problem with your css-blocks analyzer library. Please open an issue with that project.`);
    }

    // TODO: Actual implementation of StyleMapping with boolean values here.
    return {
      static: '',
      dynamic: { }
    };
  }

  /**
   * Add a single style to the analysis object. Dynamic styles will add all
   * possible applications to the correlations list.
   * ex: f(a, false); f(b, true); f(c, true) => [[a], [a, b], [a, c], [a, b, c]]
   * @param obj The block object referenced on the current element.
   * @param isDynamic If this style is dynamically applied.
   */
  addStyle( obj: BlockObject, isDynamic = false ): this {

    if ( !this.currentElement ) {
      throw new errors.CssBlockError("Can not call `addStyle` before a call to `startElement`. This is most likely a problem with your css-blocks analyzer library. Please open an issue with that project.");
    }

    this.stylesFound.add(obj);
    if ( isDynamic ) {
      this.dynamicStyles.add(obj);
    }
    this.currentElement.addStyle(obj, isDynamic);

    return this;
  }

  /**
   * Add styles to an analysis that are mutually exclusive and will never be
   * used at the same time. Always assumed to be dynamic.
   * ex: f(a); f(b, c, d); => [[a], [a, b], [a, c], [a, d]]
   * @param ...objs The block object referenced on the current element.
   */
  addExclusiveStyles( alwaysPresent: boolean, ...objs: BlockObject[] ): this {
    if ( !this.currentElement ) {
      throw new errors.CssBlockError("Can not call `addStyle` before a call to `startElement`. This is most likely a problem with your css-blocks analyzer library. Please open an issue with that project.");
    }

    objs.forEach(this.stylesFound.add.bind(this.stylesFound));
    objs.forEach(this.dynamicStyles.add.bind(this.dynamicStyles));
    this.currentElement.addExclusiveStyles( alwaysPresent, ...objs );

    return this;
  }

  /**
   * Checks if a block object is ever used in the template that was analyzed.
   * @param style the block object that might have been used.
   */
  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  /**
   * @return The local name for the block object using the local prefix for the block.
   */
  serializedName(o: BlockObject): string {
    return `${this.getBlockName(o.block) || ''}${o.asSource()}`;
  }

  /**
   * All the blocks referenced by this analysis.
   */
  referencedBlocks(): Block[] {
    return Object.keys(this.blocks).map(k => this.blocks[k]);
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

  /**
   * Return whether the styles are correlated by this analysis.
   * @param styles the styles that might be correlated
   */
  areCorrelated(...styles: BlockObject[]): boolean {
    let mapIter = this.elements.entries();
    let item = mapIter.next();
    while ( !item.done ) {
      let el: Element = item.value[1];
      for (let i = 0; i < el.correlations.length; i++) {
        let c = el.correlations[i];
        if (styles.every(s => c.has(s))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generates a [[SerializedTemplateAnalysis]] for this analysis.
   */
  serialize(): SerializedTemplateAnalysis<keyof TemplateTypes> {
    let blocks = {};
    let stylesFound: string[] =  [];
    let elements: { [id: string]: SerializedElement } = {};
    let template = this.template.serialize();

    // Sort our found styles into an array.
    let styles = [...this.stylesFound].sort((a, b) => {
      return this.serializedName(a) > this.serializedName(b) ? 1 : -1;
    });

    // Serialize our blocks to a map of their local names.
    Object.keys(this.blocks).forEach((localname) => {
      blocks[localname] = this.blocks[localname].identifier;
    });

    // Serialize all discovered styles from the sorted BlockObject array.
    styles.forEach((s) => {
      stylesFound.push(this.serializedName(s));
    });

    // Serialize all discovered Elements.
    this.elements.forEach( (el, key) => {
      elements[key] = el.serialize(styles);
    });

    // Return serialized Analysis object.
    return { template, blocks, stylesFound, elements };
  }

  /**
   * Creates a TemplateAnalysis from its serialized form.
   * @param serializedAnalysis The analysis to be recreated.
   * @param options The plugin options that are used to parse the blocks.
   * @param postcssImpl The instance of postcss that should be used to parse the block's css.
   */
  static deserialize<K extends keyof TemplateTypes>(
    serializedAnalysis: SerializedTemplateAnalysis<K>,
    blockFactory: BlockFactory
  ): Promise<TemplateAnalysis<K>> {
    let blockNames = Object.keys(serializedAnalysis.blocks);
    let info = TemplateInfoFactory.deserialize<K>(serializedAnalysis.template);
    let analysis = new TemplateAnalysis<K>(info as TemplateInfo<K>);
    let blockPromises = new Array<Promise<{name: string, block: Block}>>();
    blockNames.forEach(n => {
      let blockIdentifier = serializedAnalysis.blocks[n];
      let promise = blockFactory.getBlock(blockIdentifier).then(block => {
        return {name: n, block: block};
      });
      blockPromises.push(promise);
    });
    return Promise.all(blockPromises).then(values => {
      let localScope = new CustomLocalScope<Block, BlockObject>(OBJ_REF_SPLITTER);
      values.forEach(o => {
        analysis.blocks[o.name] = o.block;
        localScope.setSubScope(o.name, o.block);
      });
      let objects = new Array<BlockObject>();
      serializedAnalysis.stylesFound.forEach(s => {
        let blockObject = localScope.lookup(s);
        if (blockObject) {
          objects.push(blockObject);
          analysis.stylesFound.add(blockObject);
        } else {
          throw new Error(`Cannot resolve ${s} to a block style.`);
        }
      });

      let elementNames = Object.keys(serializedAnalysis.elements);
      elementNames.forEach( (elID) => {
        let data = serializedAnalysis.elements[elID];
        let element = new Element(elID, data.loc || {});
        data.static.forEach( (idx) => element.addStyle(objects[idx], false) );
        data.correlations.forEach( (correlation) => {
          let objs: BlockObject[] = [];
          let alwaysPresent = true;
          correlation.forEach((idx) => {
            if ( idx === -1 ) {
              alwaysPresent = false;
            }
            objs.push(objects[idx]);
          });
          element.addExclusiveStyles(alwaysPresent, ...objs);
        });
        analysis.elements.set(elID, element);
      });

      return analysis;
    });
  }

  forOptimizer(opts: OptionsReader): OptimizationTemplateAnalysis<K> {
    let optAnalysis = new OptimizationTemplateAnalysis<K>(this.template);
    for (let element of this.elements.values()) {
      let result = element.forOptimizer(opts);
      optAnalysis.elements.push(result[0]);
    }
    return optAnalysis;
  }
}
