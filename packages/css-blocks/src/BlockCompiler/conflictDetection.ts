import { MultiMap } from "@opticss/util";

import { SELF_SELECTOR } from "../BlockSyntax";
import { Style } from "../BlockTree";
import { longhandsFor, shorthandsFor } from "../shortHandProps";

export type Conflict = [string, string];

/**
 * Contains Sets of properties for any two `Style`s and their associated
 * pseudo elements that are in conflict with each other.
 */
export class Conflicts<T> {
  conflicts: MultiMap<string, T> = new MultiMap();
  getConflictSet(pseudo = SELF_SELECTOR): Set<T> {
    return new Set(this.conflicts.get(pseudo));
  }
}

/**
 * Given two sets representing property concerns, return a set containing the
 * properties that conflict with each other
 * @param props1  Style one.
 * @param props2  Style two.
 * @returns A Set that contains the full set of property conflicts.
 */
function detectPropertyConflicts(props1: Set<string>, props2: Set<string>): Set<Conflict> {
  let conflicts = new Set<[string, string]>();
  props1.forEach((prop) => {
    if (props2.has(prop)) {
      conflicts.add([prop, prop]);
    }
    shorthandsFor(prop).forEach((shorthandProp) => {
      if (props2.has(shorthandProp)) {
        conflicts.add([prop, shorthandProp]);
      }
    });
    longhandsFor(prop).forEach((longhandProp) => {
      if (props2.has(longhandProp)) {
        conflicts.add([prop, longhandProp]);
      }
    });
  });
  return conflicts;
}

/**
 * Given two block objects, detect all conflicting properties for itself and its
 * pseudo elements.
 * @param obj1  Style one.
 * @param obj2  Style two.
 * @returns The `Conflict` object that represents the full set of property conflicts.
 */
export function detectConflicts(obj1: Style, obj2: Style): Conflicts<Conflict> {
  let conflicts = new Conflicts<Conflict>();
  let otherPseudos = obj2.rulesets.getPseudos();
  for (let pseudo of obj1.rulesets.getPseudos()) {
    if (!otherPseudos.has(pseudo)) { continue; }
    conflicts.conflicts.set(
      pseudo,
      ...detectPropertyConflicts(
        obj1.rulesets.getProperties(pseudo),
        obj2.rulesets.getProperties(pseudo),
      ),
    );
  }
  return conflicts;
}
