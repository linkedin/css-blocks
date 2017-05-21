import { BlockObject } from "./Block";
import { shorthandsFor, longhandsFor } from "./shortHandProps";

export type Conflict = [string, string];
export class Conflicts<T> {
  conflictingProps: Set<T> = new Set();
  pseudoConflicts: Map<string, Set<T>>;
  getConflictSet(pseudo?: string): Set<T> {
    if (pseudo) {
      return this.pseudoConflicts.get(pseudo.startsWith("::") ? pseudo : ":" + pseudo) || new Set<T>();
    } else {
      return this.conflictingProps;
    }
  }
}

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

export function detectConflicts(obj1: BlockObject, obj2: BlockObject): Conflicts<Conflict> {
  let conflicts = new Conflicts<Conflict>();
  conflicts.conflictingProps = detectPropertyConflicts(obj1.propertyConcerns.getProperties(),
                                                       obj2.propertyConcerns.getProperties());
  let otherPseudos = obj2.propertyConcerns.getPseudos();
  obj1.propertyConcerns.getPseudos().forEach((pseudo) => {
    if (otherPseudos.has(pseudo)) {
      conflicts.pseudoConflicts.set(pseudo,
        detectPropertyConflicts(obj1.propertyConcerns.getProperties(pseudo),
                                obj2.propertyConcerns.getProperties(pseudo)));
    }
  });
  return conflicts;
}