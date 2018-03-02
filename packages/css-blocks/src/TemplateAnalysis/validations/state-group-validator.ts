import { unionInto } from "@opticss/util";

import { isState, StateGroup } from "../../Block";
import { isBooleanState, isStateGroup } from "../ElementAnalysis";

import { ErrorCallback, Validator } from "./Validator";

/**
 * Verify that we are not applying multiple states from a single state group in the same `objstr` call.
 */
function ensureUniqueStateGroup(discovered: Set<StateGroup>, group: StateGroup, err: ErrorCallback, track: boolean): StateGroup[] {
  let groups = [...group.resolveInheritance(), group];
  for (let g of groups) {
    if (discovered.has(g)) {
      err(`Can not apply multiple states at the same time from the exclusive state group "${g.asSource()}".`);
    }
    if (track) { discovered.add(g); }
  }
  return groups;
}

/**
 * Prevent State from being applied to an element without their associated class.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

export const stateGroupValidator: Validator = (analysis, _templateAnalysis, err) => {
  let discovered: Set<StateGroup> = new Set();
  for (let o of analysis.static) {
    if (isState(o)) {
      ensureUniqueStateGroup(discovered, o.parent, err, true);
    }
  }
  for (let stat of analysis.dynamicStates) {
    if (isBooleanState(stat)) {
      ensureUniqueStateGroup(discovered, stat.state.parent, err, true);
    }
    if (isStateGroup(stat)) {
      let tmp: Set<StateGroup> = new Set();
      for (let key of Object.keys(stat.group)) {
        let state = stat.group[key];
        let vals = ensureUniqueStateGroup(discovered, state.parent, err, false);
        vals.forEach((o) => tmp.add(o));
      }
      unionInto(discovered, tmp);
    }
  }
};
