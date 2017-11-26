import { isBlockClass } from "../../Block";
import { Validator } from "./Validator";

/**
 * Prevent State from being applied to an element without their parent BlockObject.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

const stateParentValidator: Validator = (analysis, _templateAnalysis, err) => {
  for (let state of analysis.statesFound()) {
    if (!analysis.hasClass(state.parent!)) {
      err(`Cannot use state "${state.asSource()}" without parent ` +
          `${ isBlockClass(state.parent!) ? 'class' : 'block' } also applied or implied by another style.`);
    }
  }
};

export default stateParentValidator;
