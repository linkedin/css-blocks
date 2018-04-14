import {
  Node,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
} from "babel-types";

export function isConsoleLogStatement(node: Node): boolean {
  if (isCallExpression(node)) {
    if (node.callee) {
      let callee = node.callee;
      if (isMemberExpression(callee) && isIdentifier(callee.object) && callee.object.name === "console") {
        return true;
      }
    }
  }
  return false;
}
