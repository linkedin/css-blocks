import { Block, BlockClass } from "../../Block";
import { Element } from "../ElementAnalysis";

/**
 * Prevent two BlockClasses from the same Block from being applied together.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export default function classPairsValidator(analysis: Element, err: (str: string) => void): void {

  let rootBlocks: Map<Block, BlockClass> = new Map();
  analysis.styles.forEach(( blockObj ) => {
    if ( blockObj instanceof BlockClass ) {
      if ( rootBlocks.has(blockObj.block) ) {
        let blockObj2 = rootBlocks.get(blockObj.block) as BlockClass;
        err(`Classes "${blockObj.name}" and "${blockObj2.name}" from the same block are not allowed on the same element.`);
      }
      else {
        rootBlocks.set(blockObj.block, blockObj);
      }
    }
  });

}
