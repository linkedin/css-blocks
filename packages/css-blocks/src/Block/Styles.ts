import { isObject, whatever } from "@opticss/util";

import { AttrValue, isAttrValue } from "./AttrValue";
import { BlockClass, isBlockClass } from "./BlockClass";

export { BlockClass } from "./BlockClass";
export { AttrValue } from "./AttrValue";
export type Styles = AttrValue | BlockClass;

export function isStyle(o: whatever): o is Styles {
  return isObject(o) && (isBlockClass(o) || isAttrValue(o));
}
