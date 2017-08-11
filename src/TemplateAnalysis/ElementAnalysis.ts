import { BlockObject } from "../Block";
import * as errors from "../errors";
import uniqueId from "../util/uniqueId";

const ELEMENT_ID_PREFIX = "el_";

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
  correlations: Set<BlockObject>[];
  locInfo:      errors.ErrorLocation;

  /**
   * Construct a new ElemnetAnalysis.
   * @param locInfo The location info in the template for this element.
   */
  constructor( locInfo: errors.ErrorLocation ) {
    this.id = uniqueId(ELEMENT_ID_PREFIX);
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
   * Add a single style to the analysis object. Dynamic styles will add all
   * possible applications to the correlations list.
   * ex: f(a, false); f(b, true); f(c, true) => [[a], [a, b], [a, c], [a, b, c]]
   * @param obj The block object referenced on the current element.
   * @param isDynamic If this style is dynamically applied.
   */
  addStyle( obj: BlockObject, isDynamic = false ) {
    this.styles.add(obj);

    if ( !this.correlations.length ) {
      this.correlations.push(new Set());
    }

    let toAdd: Set<BlockObject>[] = [];
    this.correlations.forEach((correlation) => {
      if ( isDynamic ) {
        correlation = new Set(correlation);
        toAdd.push(correlation);
      }
      correlation.add(obj);
    });
    this.correlations.push(...toAdd);

    if ( isDynamic ) {
      this.dynamic.add(obj);
    }

    return this;
  }

  /**
   * Add styles to an analysis that are mutually exclusive and will never be
   * used at the same time. Always assumed to be dynamic.
   * ex: f(a); f(b, c, d); => [[a], [a, b], [a, c], [a, d]]
   * @param ...objs The block object referenced on the current element.
   */
  addExclusiveStyles( alwaysPresent: boolean, ...objs: BlockObject[] ){

    if ( !this.correlations.length ) {
      this.correlations.push(new Set());
    }

    let toAdd: Set<BlockObject>[] = [];
    objs.forEach( ( obj: BlockObject, idx: number ) => {
      this.styles.add(obj);

      this.correlations!.forEach( (correlation) => {
        if ( idx === objs.length-1 && alwaysPresent ) {
          correlation.add(obj);
        }
        else {
          correlation = new Set(correlation);
          correlation.add(obj);
          toAdd.push(correlation);
        }
      });
      this.dynamic.add(obj);
    });

    this.correlations.unshift(...toAdd);
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

    this.correlations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          cc.push(parentStyles.indexOf(c));
        });
        cc.sort();
        correlations.push(cc);
      }
    });

    return {
      styles,
      dynamic,
      correlations
    };
  }
}
