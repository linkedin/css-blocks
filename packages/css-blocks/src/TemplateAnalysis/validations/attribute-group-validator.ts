import { unionInto } from "@opticss/util";

import { Attribute, isAttrValue } from "../../Block";
import { isAttrGroup, isBooleanAttr } from "../ElementAnalysis";

import { ErrorCallback, Validator } from "./Validator";

/**
 * Verify that we are not applying multiple attribute values from a single attribute group in the same `objstr` call.
 */
function ensureUniqueAttributeGroup(discovered: Set<Attribute>, group: Attribute, err: ErrorCallback, track: boolean): Attribute[] {
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
 * Prevent Attribute from being applied to an element without their associated class.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */

export const attributeGroupValidator: Validator = (analysis, _templateAnalysis, err) => {
  let discovered: Set<Attribute> = new Set();
  for (let o of analysis.static) {
    if (isAttrValue(o)) {
      ensureUniqueAttributeGroup(discovered, o.parent, err, true);
    }
  }
  for (let stat of analysis.dynamicAttributes) {
    if (isBooleanAttr(stat)) {
      ensureUniqueAttributeGroup(discovered, stat.value.parent, err, true);
    }
    if (isAttrGroup(stat)) {
      let tmp: Set<Attribute> = new Set();
      for (let key of Object.keys(stat.group)) {
        let attr = stat.group[key];
        let values = ensureUniqueAttributeGroup(discovered, attr.parent, err, false);
        values.forEach((o) => tmp.add(o));
      }
      unionInto(discovered, tmp);
    }
  }
};
