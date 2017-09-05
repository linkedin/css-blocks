import { BlockObject, State, BlockClass } from "../../Block";
import { Element } from "../ElementAnalysis";

/**
 * Prevent BlockClasses from being applied to the same element is their Root.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export default function rootClassValidator(analysis: Element, err: (str: string) => void): void {

  let statesFound: Set<State> = new Set();

  // Add any discovered root blocks to `rootBlocks` set.
  function addState( blockObj: BlockObject | undefined ){
    if ( blockObj instanceof State ) { statesFound.add(blockObj); }
  }

  // Test if a given BlockObject's is a BlockClass and if their Block is in `rootBlocks`.
  function test( state: State ){
    if ( !state.parent ) { return; }
    if ( !analysis.stylesFound.has(state.parent)  ) {
      err(`Cannot use state "${state.asSource()}" without parent ${ state.parent instanceof BlockClass ? 'class' : 'block' } also applied.`);
    }
  }

  analysis.stylesFound.forEach(addState);
  statesFound.forEach(test);

}
