import { Binding, NodePath } from "babel-traverse";
import {
  CallExpression,
  Node,
  isIdentifier,
  isImportDeclaration,
} from "babel-types";

import { ErrorLocation } from "../utils/Errors";

import { COMMON_NAMES as COMMON_OBJSTR_NAMES, ObjStrStyleFunction, objstrFn } from "./objstrFunction";

export type StyleFunction = ObjStrStyleFunction;

export interface StyleFunctionError {
  type: "error";
  canIgnore: boolean;
  message: string;
  location: ErrorLocation;
}

const COMMON_NAMES = {...COMMON_OBJSTR_NAMES};

export function isCommonNameForStyling(name: string): boolean {
  return COMMON_NAMES[name] || false;
}

// Check if a function call is calling a style function and whether that style
// function is being used properly
//
// The function called must be bound to a known style helper module.
// The name of the helper module is returned as well as that local alias of that module.
// If it's not a style function, a object with error information is returned.
export function isStyleFunction(path: NodePath<Node>, expression: CallExpression): StyleFunction | StyleFunctionError {
  let binding: Binding | undefined = undefined;
  if (isIdentifier(expression.callee)) {
    binding = path.scope.getBinding(expression.callee.name);
    if (!binding) {
      return {
        type: "error",
        canIgnore: false,
        message: `Undefined function for styling: ${expression.callee.name}`,
        location: expression.callee.loc.start,
      };
    }
  }
  if (!binding) {
    return {
      type: "error",
      canIgnore: true,
      message: `unexpected function for styling`,
      location: expression.callee.loc.start,
    };
  }
  let funcDef = binding.path.parent;
  if (isImportDeclaration(funcDef)) {
    let fn: StyleFunction | undefined = objstrFn(binding, funcDef);

    if (!fn) {
      return {
        type: "error",
        canIgnore: true,
        message: "style function is not an import",
        location: funcDef.loc.start,
      };
    } else if (binding.constantViolations.length > 0) {
      return {
        type: "error",
        canIgnore: false,
        message: `Cannot override the ${fn.name} import of '${fn.type}'`,
        location: binding.constantViolations[0].node.loc.start,
      };
    } else {
      return fn;
    }
  } else {
    return {
      type: "error",
      canIgnore: true,
      message: "style function is not an import",
      location: funcDef.loc.start,
    };
  }
}
