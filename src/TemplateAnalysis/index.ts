/**
 * @module "TemplateAnalysis"
 */
import * as path from "path";
import { BlockObject } from "../Block/BlockObject";
import { Block } from "../Block/Block";
// tslint:disable-next-line:no-unused-variable Imported for Documentation link
import { CLASS_NAME_IDENT } from "../BlockParser";

/**
 * Base class for template information for an analyzed template.
 */
export class TemplateInfo {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
}

/**
 * This interface defines a JSON friendly serialization
 * of a {TemplateAnalysis}.
 */
export interface SerializedTemplateAnalysis {
  template: string;
  blocks: {
    [localName: string]: string;
  };
  stylesFound: string[];
  dynamicStyles: number[];
   // The numbers stored in each correlation are an index into a stylesFound;
  styleCorrelations: number[][];
}

/**
 * A TemplateAnalysis performs book keeping and ensures internal consistency of the block objects referenced
 * within a template. It is designed to be used as part of an AST walk over a template.
 *
 * 1. Call [[startElement startElement()]] at the beginning of an new html element.
 * 2. Call [[addStyle addStyle(blockObject)]] for all the styles used on the current html element.
 * 2. Call [[markDynamic markDynamic(blockObject)]] for all the styles used dynamically on the current html element.
 * 3. Call [[endElement endElement()]] when done adding styles for the current element.
 */
export class TemplateAnalysis {
  template: TemplateInfo;
  /**
   * A map from a local name for the block to the [[Block]].
   * The local name must be a legal CSS ident/class name but this is not validated here.
   * See [[CLASS_NAME_IDENT]] for help validating a legal class name.
   */
  blocks: {
    [localName: string]: Block;
  };
  /**
   * All the block styles used in this template. Due to how Set works, it's exceedingly important
   * that the same instance for the same block object is used over the course of a single template analysis.
   */
  stylesFound: Set<BlockObject>;
  /**
   * All the block styles used in this template that may be applied dynamically.
   * Dynamic styles are an important signal to the optimizer.
   */
  dynamicStyles: Set<BlockObject>;
  /**
   * A list of all the styles that are used together on the same element.
   * The current correlation is added to this list when [[endElement]] is called.
   */
  styleCorrelations: Set<BlockObject>[];
  /**
   * The current correlation is created when calling [[startElement]].
   * The current correlation is unset after calling [[endElement]].
   */
  currentCorrelation: Set<BlockObject> | undefined;

  /**
   * @param template The template being analyzed.
   */
  constructor(template: TemplateInfo) {
    this.template = template;
    this.blocks = {};
    this.stylesFound = new Set();
    this.dynamicStyles = new Set();
    this.styleCorrelations = [];
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
   * @param obj The block object referenced on the current element.
   */
  addStyle(obj: BlockObject): this {
    this.stylesFound.add(obj);
    if (!this.currentCorrelation) {
      this.currentCorrelation = new Set();
    }
    this.currentCorrelation.add(obj);
    return this;
  }

  /**
   * @param obj the block object that is used dynamically. Must have already been added via [[addStyle]]
   */
  markDynamic(obj: BlockObject): this {
    if (this.stylesFound.has(obj)) {
      this.dynamicStyles.add(obj);
    } else {
      throw new Error("Cannot mark style that hasn't yet been added as dynamic.");
    }
    return this;
  }

  /**
   * Indicates a new element found in a template. no allocations are performed until a style is added
   * so it is safe to call before you know whether there are any syles on the current element.
   * Allways call [[endElement]] before calling the next [[startElement]], even if the elements are nested in the document.
   */
  startElement(): this {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      throw new Error("endElement wasn't called after a previous call to startElement");
    }
    this.currentCorrelation = undefined;
    return this;
  }

  /**
   * Indicates all styles for the element have been found.
   */
  endElement(): this {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      this.styleCorrelations.push(this.currentCorrelation);
      this.currentCorrelation = undefined;
    }
    return this;
  }

  /**
   * @return The local name for the block object using the local prefix for the block.
   */
  serializedName(o: BlockObject): string {
    return `${this.getBlockName(o.block) || ''}${o.asSource()}`;
  }

  /**
   * Generates a [[SerializedTemplateAnalysis]] for this analysis.
   * @param pathsRelativeTo A path against which all the absolute paths in this analysis should be relativized.
   */
  serialize(pathsRelativeTo: string): SerializedTemplateAnalysis {
    let blockRefs = {};
    let styles: string[] =  [];
    let dynamicStyles: number[] = [];
    Object.keys(this.blocks).forEach((localname) => {
      blockRefs[localname] = path.relative(pathsRelativeTo, this.blocks[localname].source);
    });
    this.stylesFound.forEach((s) => {
      styles.push(this.serializedName(s));
    });
    styles.sort();

    this.dynamicStyles.forEach((dynamicStyle) => {
      dynamicStyles.push(styles.indexOf(this.serializedName(dynamicStyle)));
    });

    let correlations: number[][] = [];
    this.styleCorrelations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          cc.push(styles.indexOf(this.serializedName(c)));
        });
        cc.sort();
        correlations.push(cc);
      }
    });
    return {
      template: path.relative(pathsRelativeTo, this.template.path),
      blocks: blockRefs,
      stylesFound: styles,
      dynamicStyles: dynamicStyles,
      styleCorrelations: correlations
    };
  }
}