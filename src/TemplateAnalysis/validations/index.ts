import * as errors from "../../errors";
import { Element } from "../ElementAnalysis";

import rootClassValidator from "./rootClassValidator";
import classPairsValidator from "./classPairsValidator";
import stateParentValidator from "./stateParentValidator";

const VALIDATORS = {
  "no-root-classes": rootClassValidator,
  "no-class-pairs": classPairsValidator,
  "no-state-orphans": stateParentValidator
};

const DEFAULT_VALIDATORS = {
  "no-root-classes": true,
  "no-class-pairs": true,
  "no-state-orphans": true
};

export * from "./classPairsValidator";
export * from "./rootClassValidator";
export * from "./stateParentValidator";

export type Validator = (analysis: Element, err: (str: string) => void) => void;
export type TemplateValidatorOptions = { [key: string] : Validator | boolean };

/**
 * Template validator with a single method `validate` that, given a set of
 * correlations for a given element, will throw errors for invalid BlockObject
 * correlations. Validator is instantiated with tslint-style validations config.
 *
 * Validators take the form `(str: Set<BlockObject>[], err: (str: string)) => any`.
 * The first argument is the list of possible style correlations for an element.
 * The second argument is an error callback function that will throw using the
 * provided error message and include well-formatted location data.
 *
 * Current built-in validators are:
 *
 * `no-root-classes`: Prevent BlockClasses from being applied to the same element is their Root. Enabled by default.
 * `no-class-pairs`: Prevent two BlockClasses from the same Block from being applied together. Enabled by default.
 * `no-state-orphans`: Prevent a State from being applied without its parent BlockClass or Block. Enabled by default.
 *
 * @param options A hash of tslint-style template validator options.
 */
export default class TemplateValidator {

  private validators: Validator[] = [];
  private opts: TemplateValidatorOptions = {};

  constructor(options: TemplateValidatorOptions={}) {

    // Merge our default settings with user provided options.
    let opts = this.opts = Object.assign({}, DEFAULT_VALIDATORS, options);

    // For each item in options, push all built-in and user-provided validators
    // to our validators list to await template processing.
    for ( let key in opts ) {
      if ( opts[key] instanceof Function) {
        this.validators.push(opts[key] as Validator);
      }
      else if ( !VALIDATORS[key] ) {
        throw new errors.CssBlockError(`Can not find template validator "${key}".`);
      }
      else if ( opts[key] && VALIDATORS[key] ) {
        this.validators.push(VALIDATORS[key]);
      }
    }
  }

  /**
   * Run validation on a given set of correlations. This is called by Analyzer on
   * `endElement`.
   * @param correlations The correlations object for a given element.
   * @param locInfo Location info for the elements being validated.
   */
  validate( analysis: Element, locInfo: errors.ErrorLocation ) {

    function err ( message: string ) {
      throw new errors.TemplateAnalysisError(message, locInfo);
    }

    this.validators.forEach(( func ) => {
      func(analysis, err);
    });

  }
}
