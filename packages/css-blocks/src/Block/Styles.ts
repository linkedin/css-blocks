import { isObject, whatever } from "@opticss/util";

import { BlockClass, isBlockClass } from "./BlockClass";
import { isState, State } from "./State";

export { BlockClass } from "./BlockClass";
export { State } from "./State";
export type Styles = State | BlockClass;

export function isStyle(o: whatever): o is Styles {
  return isObject(o) && (isBlockClass(o) || isState(o));
}
