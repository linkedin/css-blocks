import * as errors from '../../errors';
import { ElementAnalysis } from "../ElementAnalysis";
import { StyleAnalysis } from "../StyleAnalysis";

import { Validator } from "./Validator";

import { classPairsValidator } from "./classPairsValidator";
import { rootClassValidator } from "./rootClassValidator";
import { stateParentValidator } from "./stateParentValidator";

export * from "./classPairsValidator";
export * from "./rootClassValidator";
export * from "./stateParentValidator";

export interface TemplateValidators {
  "no-root-classes": Validator;
  "no-class-pairs": Validator;
  "no-state-orphans": Validator;
  [name: string]: Validator;
}

export type TemplateValidatorOptions = {
  [K in keyof TemplateValidators]?: boolean | Validator;
};

const VALIDATORS: TemplateValidators = {
  "no-root-classes": rootClassValidator,
  "no-class-pairs": classPairsValidator,
  "no-state-orphans": stateParentValidator
};

const DEFAULT_VALIDATORS: TemplateValidatorOptions = {
  "no-root-classes": true,
  "no-class-pairs": true,
  "no-state-orphans": true
};

/**
 * Template validator with a single method `validate` that, given a set of
 * correlations for a given element, will throw errors for invalid Style
 * correlations. Validator is instantiated with tslint-style validations config.
 *
 * Validators take the form `(str: Set<Style>[], err: (str: string)) => any`.
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
export class TemplateValidator {

  private validators: Validator[] = [];
  private opts: TemplateValidatorOptions;

  constructor(options?: Partial<TemplateValidatorOptions>) {

    // Merge our default settings with user provided options.
    let opts = this.opts = Object.assign({}, DEFAULT_VALIDATORS, options || {});

    // For each item in options, push all built-in and user-provided validators
    // to our validators list to await template processing.
    for (let key in opts) {
      if (opts[key] instanceof Function) {
        this.validators.push(opts[key] as Validator);
      }
      else if (!VALIDATORS[key]) {
        throw new errors.CssBlockError(`Can not find template validator "${key}".`);
      }
      else if (opts[key] && VALIDATORS[key]) {
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
  validate(templateAnalysis: StyleAnalysis, element: ElementAnalysis<any, any, any>) {

    function err (message: string, locInfo?: errors.ErrorLocation | undefined | null) {
      throw new errors.TemplateAnalysisError(
        message, locInfo || element.sourceLocation.start);
    }

    this.validators.forEach((func) => {
      func(element, templateAnalysis, err);
    });

  }
}
