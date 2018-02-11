import { Validator } from "./Validator";

/**
 * Prevent State from being applied to an element without their associated class.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

export const stateParentValidator: Validator = (analysis, _templateAnalysis, err) => {
  for (let state of analysis.statesFound()) {
    if (!analysis.hasClass(state.blockClass)) {
      err(`Cannot use state "${state.asSource()}" without parent ` +
          `${ state.blockClass.isRoot ? 'block' : 'class' } also applied or implied by another style.`);
    }
  }
};
