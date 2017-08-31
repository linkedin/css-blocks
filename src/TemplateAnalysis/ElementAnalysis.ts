import { BlockObject } from "../Block";
import * as errors from "../errors";

export interface StyleMapping {
  static: string;
  dynamic: { [className: string]: object | string };
}

/**
 * This interface defines a JSON friendly serialization
 * of a {Element}.
 */
export interface SerializedElement {
  styles: number[];
  dynamic: number[];
  correlations: number[][];
  loc?: errors.ErrorLocation;
}

/**
 * An ElementAnalysis performs book keeping of the block objects referenced on an
 * individual element. It is designed to be used internally by TemplateAnalysis.
 *
 * The unique id generated in the constructor is returned by `TemplateAnalysis.startElement()`.
 * This token can later be used to retreive rewritten classes and binary expressions
 * for that specific element via `TemplateAnalysis.getElementStyles()`.
 */
export class Element {

  id:           string;
  mapping:      StyleMapping;
  styles:       Set<BlockObject>;
  dynamic:      Set<BlockObject>;
  correlations: Set<BlockObject | undefined>[];
  locInfo:      errors.ErrorLocation;

  /**
   * Construct a new ElemnetAnalysis.
   * @param locInfo The location info in the template for this element.
   */
  constructor( id: string, locInfo: errors.ErrorLocation ) {
    this.id = id;
    this.styles = new Set;
    this.dynamic = new Set;
    this.correlations = [];
    this.locInfo = locInfo;
  }

  /**
   * Checks whether a block object is used in a dynamic expression in a template.
   * @param style The block object that might be dynamic.
   */
  isDynamic(style: BlockObject): boolean {
    return this.dynamic.has(style);
  }

  /**
   * Checks if a block object is ever used in the template that was analyzed.
   * @param style the block object that might have been used.
   */
  wasFound(style: BlockObject): boolean {
    return this.styles.has(style);
  }

  /**
   * Add a single style to the analysis object. Dynamic styles will also be added
   * to the dynamic styles set.
   * ex: f(a, false); f(b, true); f(c, true) => [[a], [b], [b]]
   * @param obj The block object referenced on the current element.
   * @param isDynamic If this style is dynamically applied.
   */
  addStyle( obj: BlockObject, isDynamic = false ) {

    if ( isDynamic ) {
      this.dynamic.add(obj);
    }
    else {
      this.styles.add(obj);
    }

    return this;
  }

  /**
   * Add styles to an analysis that are mutually exclusive and will never be
   * used at the same time. Always assumed to be dynamic and all are added to
   * the dynamic styles set.
   * ex: f(true, a); f(false, b, c, d); => [[a], [b, c, d, undefined]]
   * @param alwaysPresent If one of the passed objects must always be applied, set to true.
   * @param ...objs The block object referenced on the current element.
   */
  addExclusiveStyles( alwaysPresent: boolean, ...objs: BlockObject[] ){

    if ( !this.correlations.length ) {
      this.correlations.push(new Set());
    }

    let toAdd: Set<BlockObject | undefined> = new Set();
    objs.forEach( ( obj: BlockObject ) => {
      toAdd.add(obj);
    });
    if ( !alwaysPresent ) {
      toAdd.add(undefined);
    }

    this.correlations.unshift(toAdd);
  }

  serialize( parentStyles: BlockObject[] ): SerializedElement {
    let styles: number[] = [];
    let dynamic: number[] = [];
    let correlations: number[][] = [];

    this.styles.forEach((s) => {
      styles.push(parentStyles.indexOf(s));
    });
    styles.sort();

    this.dynamic.forEach((dynamicStyle) => {
      dynamic.push(parentStyles.indexOf(dynamicStyle));
    });
    dynamic.sort();

    this.correlations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          c ? cc.push(parentStyles.indexOf(c)) : cc.push(-1);
        });
        cc.sort();
        correlations.push(cc);
      }
    });

    return {
      styles,
      dynamic,
      correlations,
      loc: {}
    };
  }
}
