import { BlockObject, State, BlockClass } from "../../Block";
import { Element } from "../ElementAnalysis";

/**
 * Prevent State from being applied to an element without their parent BlockObject.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export default function rootClassValidator(analysis: Element, err: (str: string) => void): void {

  let statesFound: Set<State> = new Set();
  let parentsFound: Set<BlockObject> = new Set();

  // Add all discovered states to `statesFound` set.
  function separate( blockObj: BlockObject | undefined ){
    if ( !blockObj ) { return; }
    if ( blockObj instanceof State ) { statesFound.add(blockObj); }
    else {
      let parent: BlockObject | undefined = blockObj;
      do {
        parentsFound.add(parent);
      } while ( parent = parent.base );
    }
  }

  // Test if a given state's parent BlockObject was found in this Analysis object.
  function test( state: State ){
    if ( !state.parent ) { return; }
    if ( !parentsFound.has(state.parent)  ) {
      err(`Cannot use state "${state.asSource()}" without parent ${ state.parent instanceof BlockClass ? 'class' : 'block' } also applied.`);
    }
  }

  analysis.stylesFound.forEach(separate);
  statesFound.forEach(test);

}
