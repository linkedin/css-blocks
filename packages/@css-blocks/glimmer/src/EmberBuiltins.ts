/**
 * Ember Built-Ins are components that should be analyzed like regular
 * elements. The Analyzer and Rewriter will process components defined
 * in this file. All Built-Ins may have a `class` attribute that is
 * Analyzed and Rewritten as expected. Built-Ins may define optional
 * state mappings for state style applications managed internally to
 * the helper or component (ex: `{{link-to}}`'s `activeClass`).
 */
import { whatever } from "@opticss/util";

interface IBuiltIns {
  "link-to": object;
}

const BUILT_INS: IBuiltIns = {
  "link-to": {
    "activeClass": "[state|active]",
    "loadingClass": "[state|loading]",
    "disabledClass": "[state|disabled]",
  },
};

export type BuiltIns = keyof IBuiltIns;

export function isEmberBuiltIn(name: whatever): name is keyof IBuiltIns {
  if (typeof name === "string" && BUILT_INS[name]) { return true; }
  return false;
}

export function getEmberBuiltInStates(name: BuiltIns): object {
  return BUILT_INS[name];
}
