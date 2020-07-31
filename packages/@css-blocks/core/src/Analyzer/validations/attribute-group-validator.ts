import { unionInto } from "@opticss/util";

import { Attribute, isAttrValue } from "../../BlockTree";
import { isAttrGroup, hasAttrValue } from "../ElementAnalysis";

import { ErrorCallback, Validator } from "./Validator";

/**
 * Verify that we are not applying multiple attribute values from a single attribute group in the same `objstr` call.
 */
function ensureUniqueAttributeGroup(discovered: Set<Attribute>, group: Attribute, err: ErrorCallback, track: boolean): Attribute[] {
  let groups = [...group.resolveInheritance(), group];
  for (let g of groups) {
    if (discovered.has(g)) {
      err(`Cannot apply multiple states at the same time from the exclusive state group "${g.asSource()}".`);
    }
    if (track) { discovered.add(g); }
  }
  return groups;
}

/**
 * Prevent Attribute from being applied to an element without their associated class.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

export const attributeGroupValidator: Validator = (analysis, _templateAnalysis, err) => {
  let discovered: Set<Attribute> = new Set();
  for (let o of analysis.static) {
    if (isAttrValue(o) && !analysis.isFromComposition(o)) {
      ensureUniqueAttributeGroup(discovered, o.attribute, err, true);
    }
  }
  for (let stat of analysis.dynamicAttributes) {
    if (hasAttrValue(stat)) {
      for (let val of stat.value) {
        if (isAttrValue(val) && !analysis.isFromComposition(val)) {
          ensureUniqueAttributeGroup(discovered, val.attribute, err, true);
        }
      }
    }
    if (isAttrGroup(stat)) {
      let tmp: Set<Attribute> = new Set();
      for (let key of Object.keys(stat.group)) {
        let attr = stat.group[key];
        if (isAttrValue(attr) && !analysis.isFromComposition(attr)) {
          let values = ensureUniqueAttributeGroup(discovered, attr.attribute, err, false);
          values.forEach((o) => tmp.add(o));
        }
      }
      unionInto(discovered, tmp);
    }
  }
};
