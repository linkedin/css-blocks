// Prop Names
export const BLOCK_NAME = 'block-name';
export const EXTENDS = 'extends';
export const IMPLEMENTS = 'implements';
export const BLOCK_PROP_NAMES = new Set([BLOCK_NAME, EXTENDS, IMPLEMENTS]);

// At Rules
export const BLOCK_DEBUG = 'block-debug';
export const BLOCK_GLOBAL = 'block-global';
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
  let res = (value.match(RESOLVE_RE) || [])[3] || '';
  return res.split(/\s*,\s*/);
}
export function getConstraints(value: string): string[] {
  let res = (value.match(CONSTRAIN_RE) || [])[3] || '';
  return res.split(/\s*,\s*/);
}

// Internally use the invented `::self` pseudo selector to represent the element itself.
// This way, we can use a MultiMap to track all element and pseudo element concerns
// for any give Style instead of using different containers for the element and its pseudos.
export const SELF_SELECTOR = '::self';
