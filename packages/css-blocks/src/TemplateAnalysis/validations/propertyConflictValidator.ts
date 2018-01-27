import { Validator } from "./Validator";
import { Style, State } from "../../Block";
import {
  isTrueCondition,
  isFalseCondition,
  isStateGroup,
  isBooleanState
} from "../ElementAnalysis";

type PropMap = Map<string, Set<Style>>;

/**
 * Fetch a Set at `key` from input `map`. If it does not yet exist, create it.
 * @param  map  The map to query.
 * @param  key  The key to query at.
 * @returns  The requested Set
 */
function ensureSet<T=Style>(map: Map<string, Set<T>>, key: string): Set<T> {
  let set = map.get(key);
  if (!set) {
    map.set(key, (set = new Set));
  }
  return set;
}

/**
 * Merge Map B into Map A. Modifies Map A in place.
 * @param  a  Map A.
 * @param  b  Map B.
 */
function merge(a: PropMap, b: PropMap){
  b.forEach((bList, prop) => {
    let aList = a.get(prop);
    if (!aList) {
      aList = new Set;
    }
    a.set(prop, new Set([...aList, ...bList]));
  });
}

/**
 * Add all properties to a supplied PropMap
 * @param  propToBlocks  The PropMap to add properties to.
 * @param  obj  The Style object to track.
 */
function add(propToBlocks: PropMap, obj: Style){
  let concerns = obj.propertyConcerns.getProperties();
  concerns.forEach((prop) => {
    let matches = ensureSet(propToBlocks, prop);
    matches.add(obj);
  });
}

/**
 * Test if a given Style object is in conflict with with a PropMap.
 * If the they are in conflict, store the conflicting Styles list in
 * the `conflicts` PropMap.
 * @param  obj  The Style object to we're testing.
 * @param  propToBlocks  The previously encountered properties mapped to the owner Styles.
 * @param  conflicts  Where we store conflicting Style data.
 */
function evaluate(obj: Style, propToBlocks: PropMap, conflicts: PropMap) {
  let concerns = obj.propertyConcerns.getProperties();
  concerns.forEach((prop) => {
    let matches = ensureSet(propToBlocks, prop);
    if (matches.size) {
      matches.forEach((match) => {
        if (
          obj.commonAncester(match) ||
          obj.propertyConcerns.hasResolutionFor(prop, match) ||
          match.propertyConcerns.hasResolutionFor(prop, obj)
        ) { return; }
        let list = ensureSet(conflicts, prop);
        list.add(match);
        list.add(obj);
      });
    }
  });
}

/**
 * Prevent conflicting styles from being applied to the same element without an explicit resoution.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
const propertyConflictValidator: Validator = (elAnalysis, _templateAnalysis, err) => {

  // Conflicting Styles stored here.
  let conflicts: PropMap = new Map;

  // Storage for static Styles
  let staticPropToBlocks: PropMap = new Map;

  // For each static style, evaluate it and add it to the static store.
  elAnalysis.static.forEach((obj) => {
    evaluate(obj, staticPropToBlocks, conflicts);
    add(staticPropToBlocks, obj);
  });

  // For each dynamic class, test it against the static classes,
  // and independantly compare the mutually exclusive truthy
  // and falsy conditions. Once done, merge all concerns into the
  // static store.
  elAnalysis.dynamicClasses.forEach((condition) => {
    let truthyPropToBlocks: PropMap = new Map;
    let falsyPropToBlocks: PropMap = new Map;

    if (isTrueCondition(condition)) {
      condition.whenTrue.forEach((obj) => {
        evaluate(obj, staticPropToBlocks, conflicts);
        evaluate(obj, truthyPropToBlocks, conflicts);
        add(truthyPropToBlocks, obj);
      });
    }
    if (isFalseCondition(condition)) {
      condition.whenFalse.forEach((obj) => {
        evaluate(obj, staticPropToBlocks, conflicts);
        evaluate(obj, falsyPropToBlocks, conflicts);
        add(falsyPropToBlocks, obj);
      });
    }

    merge(staticPropToBlocks, truthyPropToBlocks);
    merge(staticPropToBlocks, falsyPropToBlocks);

  });

  // For each dynamic state, process those in state groups independently,
  // as they are mutually exclusive. Boolean states are evaluated directly.
  elAnalysis.dynamicStates.forEach((condition) => {
    if (isStateGroup(condition)) {
      let tmp: PropMap = new Map;
      (Object as any).values(condition.group).forEach((state: State) => {
        evaluate(state, staticPropToBlocks, conflicts);
        add(tmp, state);
      });
      merge(staticPropToBlocks, tmp);
    }

    else if (isBooleanState(condition)) {
      evaluate(condition.state, staticPropToBlocks, conflicts);
      add(staticPropToBlocks, condition.state);
    }
  });

  // For every set of conflicting properties, throw the error.
  if (conflicts.size) {
    let msg = 'The following property conflicts must be resolved for element located at';
    let details = '';
    conflicts.forEach((matches, prop) => {
      if (!prop || !matches.size) { return; }
      details += `  ${prop}: ${[...matches].map((m) => m.block.name + m.asSource() ).join(', ')}\n`;
    });
    err(msg, null, details);
  }

};

export default propertyConflictValidator;