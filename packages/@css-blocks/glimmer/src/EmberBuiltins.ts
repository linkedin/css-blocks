import { AST } from "@glimmer/syntax";

import { isBlockStatement, isMustacheStatement } from "./utils";

/**
 * Ember Built-Ins are components that should be analyzed like regular
 * elements. The Analyzer and Rewriter will process components defined
 * in this file. All Built-Ins may have a `class` attribute that is
 * Analyzed and Rewritten as expected. Built-Ins may define optional
 * state mappings for state style applications managed internally to
 * the helper or component (ex: `{{link-to}}`'s `activeClass`).
 */

interface IBuiltIns {
  "link-to": object;
}

const BUILT_INS: IBuiltIns = {
  "link-to": {
    "activeClass": "[active]",
    "loadingClass": "[loading]",
    "disabledClass": "[disabled]",
  },
};

export type BuiltIns = keyof IBuiltIns;

export function isEmberBuiltInNode(node: AST.Node): node is AST.BlockStatement | AST.MustacheStatement {
  if (isBlockStatement(node) || isMustacheStatement(node)) {
    let name = node.path.original;
    if (typeof name === "string" && BUILT_INS[name]) {
      return true;
    }
  }
  return false;
}
export function isEmberBuiltIn(name: unknown): name is keyof IBuiltIns {
  if (typeof name === "string" && BUILT_INS[name]) { return true; }
  return false;
}

export function getEmberBuiltInStates(name: BuiltIns): object {
  return BUILT_INS[name];
}
