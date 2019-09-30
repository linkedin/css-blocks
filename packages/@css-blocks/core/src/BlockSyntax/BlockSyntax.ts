import regexpu = require("regexpu-core");

/**
 * CSS <ident-token> RegExp.
 * Defined: https://www.w3.org/TR/css-syntax-3/#typedef-ident-token
 */
export const CLASS_NAME_IDENT = new RegExp(regexpu("^(-?(?:\\\\.|[A-Za-z_\\u{0080}-\\u{10ffff}])(?:\\\\.|[A-Za-z0-9_\\-\\u{0080}-\\u{10ffff}])*)$", "u"));

// Prop Names
export const EXTENDS = "extends";
export const IMPLEMENTS = "implements";
export const BLOCK_NAME = "block-name";
export const COMPOSES = "composes";
export const BLOCK_PROP_NAMES = new Set([BLOCK_NAME, EXTENDS, IMPLEMENTS, COMPOSES]);
export const BLOCK_PROP_NAMES_RE = /^(extends|implements|block-name|composes)$/;

// At Rules
export const BLOCK_DEBUG = "block-debug";
export const BLOCK_GLOBAL = "block-global";
export const BLOCK_IMPORT = "block";
export const BLOCK_EXPORT = "export";
export const BLOCK_AT_RULES = new Set([BLOCK_DEBUG, BLOCK_GLOBAL, BLOCK_IMPORT, BLOCK_EXPORT]);

// Prop Values
// TODO: Flesh out prop value parser APIs and actually use them.
// TODO: These need to better handle complex values in their passed to them.

export interface Resolution {
  isInherited: boolean;
  path: string;
}

const RESOLVE_RE = /resolve(-inherited)?\(("|')([^\2]*)\2\)/;
const CONSTRAIN_RE = /constrain\(("|')([^\1]*)\1\)/;
export function isResolution(value: string): boolean {
  return RESOLVE_RE.test(value);
}
export function isConstraint(value: string): boolean {
  return CONSTRAIN_RE.test(value);
}
export function getResolution(value: string): Resolution {
  let res = value.match(RESOLVE_RE) || [];
  return {
    isInherited: !!res[1],
    path: (res[3] || ""),
  };
}
export function getConstraints(value: string): string[] {
  let res = (value.match(CONSTRAIN_RE) || [])[3] || "";
  return res.split(/\s*,\s*/);
}

// Internally use the invented `::self` pseudo selector to represent the element itself.
// This way, we can use a MultiMap to track all element and pseudo element concerns
// for any give Style instead of using different containers for the element and its pseudos.
export const SELF_SELECTOR = "::self";

// Internally use the invented `::attr-present` value name to represent a bare attribute selector with no value set.
// This way, we can treat the absence of a value selector as just another `Value` object instead of having to
// special case it in the `Attribute` Block object.
export const ATTR_PRESENT = "::attr-present";

// Internally use the invented `root` class represents the root element styling for a block. By interpreting the
// root selector as just another class we no longer have to store styling information it on the `Block` object..
export const ROOT_CLASS = ":scope";

// The string `default` is used throughout the system to represent the default export of a block file.
export const DEFAULT_EXPORT = "default";

/**
 * Names that a block cannot have lest it collides with other syntax.
 */
export const RESERVED_BLOCK_NAMES = new Set<string>([DEFAULT_EXPORT, "html", "svg", "math"]);
Object.freeze(RESERVED_BLOCK_NAMES);
