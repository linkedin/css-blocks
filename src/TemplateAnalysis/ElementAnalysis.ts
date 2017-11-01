import { OptionsReader } from '../OptionsReader';
import { BlockObject } from "../Block";
import * as errors from '../errors';
import {
  Element as OptimizerElement,
  Tagname,
  POSITION_UNKNOWN,
  SourcePosition,
  AttributeValueSet,
  AttributeValueChoice,
  Attribute,
} from "@opticss/template-api";
import {
  ObjectDictionary
} from "@opticss/util";
import { unionInto } from '../util/unionInto';

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

  mapping: {
    static: string;
    dynamic: ObjectDictionary<object | string>;
  };

  id:            string | undefined;
  stylesFound:   Set<BlockObject>;
  static:        Set<BlockObject>;
  correlations:  Set<BlockObject | undefined>[];
  locInfo:       errors.ErrorLocation;

  /**
   * Construct a new Element.
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

  forOptimizer(opts: OptionsReader): [OptimizerElement, Map<string, BlockObject>] {
    let classMap = new Map<string, BlockObject>();
    let startPosition: SourcePosition;
    let { filename, line, column } = this.locInfo;
    if (line) {
      startPosition = { filename, line, column };
    } else {
      startPosition = POSITION_UNKNOWN;
    }
    let tagName = new Tagname({unknown: true});
    let value: AttributeValueSet = {allOf: []};
    let staticStyles = new Set<BlockObject>();
    for (let style of this.static) {
      unionInto(staticStyles, style.resolveStyles());
    }

    let commonStyles: Set<BlockObject> | undefined = undefined;
    let resolvedCorrelations = new Array<Array<Set<BlockObject> | undefined>>();
    for (let correlation of this.correlations) {
      let resolvedCorrelation = new Array<Set<BlockObject> | undefined>();
      commonStyles = correlation.has(undefined) ? new Set() : undefined;
      for (let style of correlation) {
        if (style) {
          let resolved = style.resolveStyles();
          if (!commonStyles) {
            commonStyles = new Set();
            unionInto(commonStyles, resolved);
          } else {
            for (let style of commonStyles) {
              if (!resolved.has(style)) commonStyles.delete(style);
            }
          }
          resolvedCorrelation.push(resolved);
        } else {
          resolvedCorrelation.push(undefined);
        }
      }
      if (commonStyles && commonStyles.size > 0) {
        for (let style of commonStyles) {
          for (let resolved of resolvedCorrelation) {
            if (resolved) resolved.delete(style);
          }
        }
        unionInto(staticStyles, commonStyles);
      }
      resolvedCorrelations.push(resolvedCorrelation);
    }

    for (let style of staticStyles) {
      let className = style.cssClass(opts);
      classMap.set(className, style);
      value.allOf.push({constant: className});
    }

    for (let correlation of resolvedCorrelations) {
      if (correlation.length === 0) {
        continue;
      }
      if (correlation.length === 1) { throw new Error("internal error: this should have been converted to a static style"); }

      let choice: AttributeValueChoice = {oneOf: []};
      for (let styles of correlation) {
        if (styles) {
          let classes = new Array<string>();
          for (let style of styles) {
            let className = style.cssClass(opts);
            classMap.set(className, style);
            classes.push(className);
          }
          if (classes.length > 1) {
            choice.oneOf.push({allOf: classes.map(c => ({constant: c}))});
          } else {
            choice.oneOf.push({constant: classes[0]});
          }
        } else {
          choice.oneOf.push({absent: true});
        }
      }
      value.allOf.push(choice);
    }
    let classAttr = new Attribute("class", value);
    return [
      new OptimizerElement(tagName, [classAttr], {start: startPosition}, this.id),
      classMap
    ];
  }
}
