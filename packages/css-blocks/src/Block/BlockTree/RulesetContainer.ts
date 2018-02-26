/**
 * The `RulesetContainer` module contains classes used to track declaration concerns and
 * explicit resolutions associated with a `Style` object.
 *
 * Every `Style` object has a `RulesetContainer`. A `Style` object's behavior may be defined
 * by multiple rulesets, and may have multiple stylable targets (ex: `::self`, `::before`,
 * `::after`). Every ruleset may provide resolution guidance against another `Style` object.
 *
 * @module Block/BlockTree/RulesetContainer
 */
import { MultiMap, TwoKeyMultiMap } from "@opticss/util";
import * as propParser from "css-property-parser";
import { ParsedSelector, parseSelector } from "opticss";
import * as postcss from "postcss";

import { BLOCK_PROP_NAMES, RESOLVE_RE, SELF_SELECTOR } from "../../BlockSyntax";
import { sourceLocation } from "../../SourceLocation";
import { InvalidBlockSyntax } from "../../errors";

import { Inheritable } from "./Inheritable";
import { AnyStyle, isStyle, Style } from "./Style";

// Required for Typescript so it can "name" types in the generated types definition file.
export { Style, Inheritable };

// Convenience types to help our code read better.
export type Pseudo = string;
export type Property = string;

export type Declaration = {
  node: postcss.Declaration;
  value: string;
};

export type Resolution = {
  node: postcss.Rule;
  property: string;
  resolution: AnyStyle;
};

/**
 * Safely expand a property value pair into its constituent longhands,
 * even if it is not a valid declaration.
 * @param  property  A CSS property name.
 * @param  value  A CSS property value.
 */
function expandProp(prop: string, value: string): propParser.Declarations {
  let expanded: propParser.Declarations = {};
  if (propParser.isValidDeclaration(prop, value)) {
    expanded = propParser.expandShorthandProperty(prop, value, true, false);
  }
  expanded[prop] = value;
  return expanded;
}

/**
 * Represents an individual ruleset, its property concerns, and Style resolutions.
 */
export class Ruleset {
  file: string;
  node: postcss.Rule;
  style: AnyStyle;

  declarations = new MultiMap<Property, Declaration>();
  resolutions = new MultiMap<Property, AnyStyle>();

  constructor(file: string, node: postcss.Rule, style: AnyStyle) {
    this.file = file;
    this.node = node;
    this.style = style;
  }

  /**
   * Add a new resolution on this ruleset for a given property and Style.
   * @param  property  A CSS property name.
   * @param  style  The Style object this property should resolve to.
   */
  addResolution(property: Property, style: AnyStyle): void {
    let expanded = expandProp(property, "inherit");
    for (let prop of Object.keys(expanded)) {
      this.resolutions.set(prop, style);
    }
  }

  /**
   * Return true or false if this ruleset has a resolution for a given property and Style.
   * @param  property  A CSS property name.
   * @param  style  The Style object this property should resolve to.
   */
  hasResolutionFor(property: Property, other: AnyStyle): boolean {
    return this.resolutions.hasValue(property, other);
  }

}

/**
 * Cache and interface methods for all rulesets that may apply to a Style.
 */
export class RulesetContainer {

  // The owner `Style` of this `RulesetContainer`
  private parent: AnyStyle;

  // Contains all rulesets that apply to each possible element/pseudo-element target.
  private rules: MultiMap<Pseudo, Ruleset> = new MultiMap(false);

  // Contains all rulesets, accessible by property concern, that apply to each possible element/pseudo-element target.
  private concerns: TwoKeyMultiMap<Pseudo, Property, Ruleset> = new TwoKeyMultiMap(false);

  constructor(parent: AnyStyle) {
    this.parent = parent;
  }

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param  rule  PostCSS ruleset
   * @param  block  External block
   */
  addRuleset(file: string, rule: postcss.Rule) {
    let style = this.parent;
    let selectors: ParsedSelector[] = parseSelector(rule);

    selectors.forEach((selector) => {
      let ruleSet = new Ruleset(file, rule, style);
      let key = selector.key;
      let pseudo: string = key.pseudoelement ? key.pseudoelement.toString() : SELF_SELECTOR;

      rule.walkDecls((decl) => {

        // Ignore css-blocks specific properties.
        if (BLOCK_PROP_NAMES.has(decl.prop)) { return; }

        // Check if this is a resolve statement.
        let referenceStr = (decl.value.match(RESOLVE_RE) || [])[3];

        // If this is a resolution, track that this property has been resolved
        // Resolution paths are always relative to the root node.
        if (referenceStr) {
          let errLoc = sourceLocation(file, decl);
          let other = style.root.lookup(referenceStr, errLoc);

          if (other && other.block === style.block) {
            throw new InvalidBlockSyntax(`Cannot resolve conflicts with your own block.`, errLoc);
          }

          if (other && other.block.isAncestorOf(style.block)) {
            throw new InvalidBlockSyntax(`Cannot resolve conflicts with ancestors of your own block.`, errLoc);
          }

          if (isStyle(other)) { ruleSet.addResolution(decl.prop, other); }
        }

        // If not a resolution, add this as a tracked property on our Ruleset.
        else {
          let expanded = expandProp(decl.prop, decl.value);
          for (let prop in expanded) {
            let value = expanded[prop];
            ruleSet.declarations.set(prop, { node: decl, value });
            this.concerns.set(pseudo, prop, ruleSet);
          }
        }
      });

    });
  }

  /**
   * Retrieve all Rulesets that define this Style's behavior.
   * Filter by property concern and optional pseudo. If no pseudo
   * is provided, Rulesets from across all pseudos are returned.
   * @param  pseudo  Optional pseudo element to get Rulesets for
   * @returns A set of Ruleset objects.
   */
  getRulesets(prop: string, pseudo?: string): Set<Ruleset> {
    if (!pseudo) {
      let res: Ruleset[] = [];
      for (let pseudo of this.getPseudos()) {
        res = [...res, ...this.concerns.get(pseudo, prop)];
      }
      return new Set(res);
    }

    return new Set(this.concerns.get(pseudo, prop));
  }

  /**
   * Retrieve a full Set of properties used by any Ruleset that defines this Style.
   * Optional filter by pseudo. If no pseudo is provided, properties from across all
   * pseudos are returned.
   * @param  pseudo  Optional pseudo element to get properties from
   * @returns A set of property names.
   */
  getProperties(pseudo = SELF_SELECTOR): Set<string> {
    if (!pseudo) {
      let res: string[] = [];
      for (let pseudo of this.getPseudos()) {
        res = [...res, ...this.getProperties(pseudo)];
      }
      return new Set(res);
    }
    return new Set([...this.concerns.subKeys(pseudo)]);
  }

  /**
   * Retrieve all pseudo elements which were found to have properties for this Style.
   * @returns A set of pseudo element names.
   */
  getPseudos(): Set<string> {
    return new Set([...this.concerns.primaryKeys()]);
  }

  /**
   * Iterate over all stored resolutions.
   * @returns Resolution  An iterable set of Resolution objects.
   */
  *getAllResolutions(): Iterable<Resolution> {
    let ruleSets = this.rules.individualValues();
    for (let rule of ruleSets) {
      for (let [property, styles] of rule.resolutions) {
        for (let style of styles) {
          yield {
            node: rule.node,
            property,
            resolution: style,
          };
        }
      }
    }
  }

}
