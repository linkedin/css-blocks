import regexpu = require("regexpu-core");

/**
 * CSS <ident-token> RegExp.
 * Defined: https://www.w3.org/TR/css-syntax-3/#typedef-ident-token
 */
export const CLASS_NAME_IDENT = new RegExp(regexpu("^(-?(?:\\\\.|[A-Za-z_\\u{0080}-\\u{10ffff}])(?:\\\\.|[A-Za-z0-9_\\-\\u{0080}-\\u{10ffff}])*)$", "u"));

// State Namespace
export const STATE_NAMESPACE = "state";

// Prop Names
export const BLOCK_NAME = "block-name";
export const EXTENDS = "extends";
export const IMPLEMENTS = "implements";
export const BLOCK_PROP_NAMES = new Set([BLOCK_NAME, EXTENDS, IMPLEMENTS]);

// At Rules
export const BLOCK_DEBUG = "block-debug";
export const BLOCK_GLOBAL = "block-global";
export const BLOCK_REFERENCE = "block-reference";
export const BLOCK_AT_RULES = new Set([BLOCK_DEBUG, BLOCK_GLOBAL, BLOCK_REFERENCE]);

// Prop Values
// TODO: Make regexps private and consume below APIs instead.
export const RESOLVE_RE = /resolve(-inherited)?\(("|')([^\2]*)\2\)/;
export const CONSTRAIN_RE = /constrain\(("|')([^\2]*)\2\)/;

// TODO: Flesh out prop value parser APIs and actually use them.
// TODO: These need to better handle complex values in their passed to them.

export function isResolution(value: string): boolean {
  return RESOLVE_RE.test(value);
}
export function isConstraint(value: string): boolean {
  return CONSTRAIN_RE.test(value);
}
export function getResolutions(value: string): string[] {
  let res = (value.match(RESOLVE_RE) || [])[3] || "";
  return res.split(/\s*,\s*/);
}
export function getConstraints(value: string): string[] {
  let res = (value.match(CONSTRAIN_RE) || [])[3] || "";
  return res.split(/\s*,\s*/);
}

// Internally use the invented `::self` pseudo selector to represent the element itself.
// This way, we can use a MultiMap to track all element and pseudo element concerns
// for any give Style instead of using different containers for the element and its pseudos.
export const SELF_SELECTOR = "::self";

// Internally use the invented `::universal` state name to represent a bare state selector with no value set.
// This way, we can treat the universal state selector as just another `State` object instead of having to
// special case it in the `StateGroup` Block object.
export const UNIVERSAL_STATE = "::universal";

// Internally use the invented `root` class represents the root element styling for a block. By interpreting the
// root selector as just another class we no longer have to store styling information it on the `Block` object..
export const ROOT_CLASS = ":scope";
