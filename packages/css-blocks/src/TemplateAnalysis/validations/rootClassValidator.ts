import { Validator } from "./Validator";

/**
 * Prevent BlockClasses from being applied to the same element is their Root.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
const rootClassValidator: Validator = (analysis, templateAnalysis, err) => {
  for (let block of templateAnalysis.blockDependencies()) {
    let foundRoot = false;
    let foundClass = false;
    for (let container of analysis.classesForBlock(block)) {
      foundRoot = foundRoot || container.isRoot;
      foundClass = foundClass || !container.isRoot;
    }
    if (foundRoot && foundClass) {
      err(`Cannot put block classes on the block's root element`);
    }
  }
};

export default rootClassValidator;