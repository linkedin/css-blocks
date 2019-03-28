import * as propParser from "css-property-parser";

import { isResolution } from "../BlockSyntax";

const BORDER_SHORTHANDS = new Set(["border-top", "border-bottom", "border-left", "border-right"]);

/**
 * Safely expand a property value pair into its constituent longhands,
 * even if it is not a valid declaration.
 * @param  property  A CSS property name.
 * @param  value  A CSS property value.
 */
export function expandProp(prop: string, value: string): propParser.Declarations {
  let expanded: propParser.Declarations = {};

  // PropertyParser bug causes infinite loop when parsing `font-family`.
  // https://github.com/mahirshah/css-property-parser/issues/33
  if (prop === "font-family") {
    expanded[prop] = value;
    return expanded;
  }

  // The PropertyParser doesn't understand resolve statements.
  // Replace them with something it understands.
  if (isResolution(value)) { value = "inherit"; }

  // The PropertyParser doesn't understand CSS variables.
  // Replace them with something it understands.
  value = value.replace(/var\([^\)]+\)/gi, "inherit");

  // The PropertyParser doesn't understand these intermediate border shorthands.
  // Ducktape it together so it can.
  let borderProp: string | null = null;
  if (BORDER_SHORTHANDS.has(prop)) {
    borderProp = prop;
    prop = "border";
  }

  if (propParser.isValidDeclaration(prop, value)) {
    expanded = propParser.expandShorthandProperty(prop, value, true, false);
  }
  expanded[prop] = value;

  // Correct for intermediate border shorthands.
  if (borderProp) {
    expanded[borderProp] = value;
    delete expanded["border"];
    delete expanded["border-color"];
    delete expanded["border-style"];
    delete expanded["border-width"];
    for (let bprop of BORDER_SHORTHANDS) {
      if (bprop === borderProp) { continue; }
      delete expanded[`${bprop}-color`];
      delete expanded[`${bprop}-style`];
      delete expanded[`${bprop}-width`];
    }
  }
  else if (prop === "border") {
    expanded["border-top"] = value;
    expanded["border-left"] = value;
    expanded["border-bottom"] = value;
    expanded["border-right"] = value;
  }

  return expanded;
}
