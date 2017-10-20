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
  static: number[];
  correlations: number[][];
  loc?: errors.ErrorLocation;
}

/**
 * An ElementAnalysis performs book keeping of the block objects referenced on an
 * individual element. It is designed to be used internally by TemplateAnalysis.
 *
 * The unique id generated in the constructor is returned by `TemplateAnalysis.startElement()`.
 * This token can later be used to retrieve rewritten classes and binary expressions
 * for that specific element via `TemplateAnalysis.getElementStyles()`.
 */
export class Element {

  id:           string;
  mapping:      StyleMapping;
  stylesFound:  Set<BlockObject>;
  static:       Set<BlockObject>;
  correlations: Set<BlockObject | undefined>[];
  locInfo:      errors.ErrorLocation;

  /**
   * Construct a new ElementAnalysis.
   * @param locInfo The location info in the template for this element.
   */
  constructor( id: string, locInfo: errors.ErrorLocation ) {
    this.id = id;
    this.stylesFound = new Set;
    this.static = new Set;
    this.correlations = [];
    this.locInfo = locInfo;
  }

  /**
   * Checks if a block object is ever used in the template that was analyzed.
   * @param style the block object that might have been used.
   */
  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  /**
   * Add a single style to the analysis object.
   * ex: f(a, false); f(b, true); f(c, true) => [[a], [b, undefined], [c, undefined]]
   * @param obj The block object referenced on the current element.
   * @param isDynamic If this style is conditionally applied.
   */
  addStyle( obj: BlockObject, isDynamic = false ) {

    this.stylesFound.add(obj);

    if ( isDynamic ) {
      this.correlations.push(new Set([obj, undefined]));
    }
    else {
      this.static.add(obj);
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

    let toAdd: Set<BlockObject | undefined> = new Set();
    objs.forEach( ( obj: BlockObject ) => {
      this.stylesFound.add(obj);
      toAdd.add(obj);
    });
    if ( !alwaysPresent ) {
      toAdd.add(undefined);
    }

    this.correlations.push(toAdd);
  }

  serialize( parentStyles: BlockObject[] ): SerializedElement {
    let staticStyles: number[] = [];
    let correlations: number[][] = [];

    this.static.forEach((s) => {
      staticStyles.push(parentStyles.indexOf(s));
    });
    staticStyles.sort();

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
      static: staticStyles,
      correlations,
      loc: {}
    };
  }
}
