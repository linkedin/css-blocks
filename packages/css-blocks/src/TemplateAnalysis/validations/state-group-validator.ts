import { unionInto } from "@opticss/util";

import { Attribute, isAttrValue } from "../../Block";
import { isBooleanState, isStateGroup } from "../ElementAnalysis";

import { ErrorCallback, Validator } from "./Validator";

/**
 * Verify that we are not applying multiple states from a single state group in the same `objstr` call.
 */
function ensureUniqueStateGroup(discovered: Set<Attribute>, group: Attribute, err: ErrorCallback, track: boolean): Attribute[] {
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
  let discovered: Set<Attribute> = new Set();
  for (let o of analysis.static) {
    if (isAttrValue(o)) {
      ensureUniqueStateGroup(discovered, o.parent, err, true);
    }
  }
  for (let stat of analysis.dynamicStates) {
    if (isBooleanState(stat)) {
      ensureUniqueStateGroup(discovered, stat.state.parent, err, true);
    }
    if (isStateGroup(stat)) {
      let tmp: Set<Attribute> = new Set();
      for (let key of Object.keys(stat.group)) {
        let state = stat.group[key];
        let vals = ensureUniqueStateGroup(discovered, state.parent, err, false);
        vals.forEach((o) => tmp.add(o));
      }
      unionInto(discovered, tmp);
    }
  }
};
