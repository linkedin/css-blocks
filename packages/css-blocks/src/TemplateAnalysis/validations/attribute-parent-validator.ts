import { Validator } from "./Validator";

/**
 * Prevent Attributes from being applied to an element without their associated class.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

export const attributeParentValidator: Validator = (analysis, _templateAnalysis, err) => {
  for (let attr of analysis.attributesFound()) {
    if (!analysis.hasClass(attr.blockClass)) {
      err(`Cannot use state "${attr.asSource()}" without parent ` +
          `${ attr.blockClass.isRoot ? "block" : "class" } also applied or implied by another style.`);
    }
  }
};
