import { BlockObject, Block, BlockClass } from "../../Block";

/**
 * Prevent two BlockClasses from the same Block from being applied together.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export default function classPairsValidator(correlations: Set<BlockObject>[], err: (str: string) => any) {
  correlations.forEach(( correlation ) => {
    let rootBlocks: Set<Block> = new Set();
    correlation.forEach(( blockObj ) => {
      if ( blockObj instanceof BlockClass ) {
        if ( rootBlocks.has(blockObj.block) ) {
          err(`Multiple classes from the same block on an element are not allowed.`);
        }
        else {
          rootBlocks.add(blockObj.block);
        }
      }
    });
  });
}
