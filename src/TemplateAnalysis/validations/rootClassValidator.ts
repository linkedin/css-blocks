import { BlockObject, Block, BlockClass } from "../../Block";
import { Element } from "../ElementAnalysis";

/**
 * Prevent BlockClasses from being applied to the same element is their Root.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export default function rootClassValidator(analysis: Element, err: (str: string) => void): void {

  let rootBlocks: Set<Block> = new Set();

  // Add any discovered root blocks to `rootBlocks` set.
  function add(blockObj: BlockObject | undefined){
    if ( blockObj instanceof Block ) { rootBlocks.add(blockObj); }
  }

  // Test if a given BlockObject's is a BlockClass and if their Block is in `rootBlocks`.
  function test(blockObj: BlockObject | undefined){
    if ( (blockObj instanceof BlockClass) && rootBlocks.has(blockObj.block) ) {
      err(`Cannot put block classes on the block's root element`);
    }
  }

  analysis.styles.forEach(add);
  analysis.dynamic.forEach(add);
  analysis.correlations.forEach(( correlation ) => { correlation.forEach(add); });

  analysis.styles.forEach(test);
  analysis.dynamic.forEach(test);
  analysis.correlations.forEach(( correlation ) => { correlation.forEach(test); });

}
