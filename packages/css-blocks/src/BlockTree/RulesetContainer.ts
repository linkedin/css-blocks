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
import { ParsedSelector } from "opticss";
import * as postcss from "postcss";

import { BLOCK_PROP_NAMES, RESOLVE_RE, SELF_SELECTOR } from "../BlockSyntax";
import { InvalidBlockSyntax } from "../errors";
import { sourceLocation } from "../SourceLocation";

import { Styles, isStyle } from "./Styles";
export { Styles, BlockClass, AttrValue } from "./Styles";

// Convenience types to help our code read better.
export type Pseudo = string;
export type Property = string;

export type Declaration = {
  node: postcss.Declaration;
  value: string;
};

export type Resolution<S extends Styles = Styles> = {
  node: postcss.Rule;
  property: string;
  resolution: S;
};

/**
 * Safely expand a property value pair into its constituent longhands,
 * even if it is not a valid declaration.
 * @param  property  A CSS property name.
 * @param  value  A CSS property value.
 */
function expandProp(prop: string, value: string): propParser.Declarations {
  let expanded: propParser.Declarations = {};

  // The PropertyParser doesn't understand CSS variables.
  // Replace them with something it understands.
  value = value.replace(/var\([^\)]+\)/gi, "inherit");
  if (propParser.isValidDeclaration(prop, value)) {
    expanded = propParser.expandShorthandProperty(prop, value, true, false);
  }
  expanded[prop] = value;
  return expanded;
}

/**
 * Represents an individual ruleset, its property concerns, and Style resolutions.
 */
export class Ruleset<Style extends Styles = Styles> {
  file: string;
  node: postcss.Rule;
  style: Style;

  declarations = new MultiMap<Property, Declaration>();
  resolutions = new MultiMap<Property, Styles>();

  constructor(file: string, node: postcss.Rule, style: Style) {
    this.file = file;
    this.node = node;
    this.style = style;
  }

  /**
   * Add a new resolution on this ruleset for a given property and Style.
   * @param  property  A CSS property name.
   * @param  style  The Style object this property should resolve to.
   */
  addResolution(property: Property, style: Styles): void {
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
  hasResolutionFor(property: Property, other: Styles): boolean {
    return this.resolutions.hasValue(property, other);
  }

}

/**
 * Cache and interface methods for all rulesets that may apply to a Style.
 */
export class RulesetContainer<S extends Styles> {

  // The owner `Style` of this `RulesetContainer`
  private parent: S;

  // Contains all rulesets that apply to each possible element/pseudo-element target.
  private rules: MultiMap<Pseudo, Ruleset<S>> = new MultiMap(false);

  // Contains all rulesets, accessible by property concern, that apply to each possible element/pseudo-element target.
  private concerns: TwoKeyMultiMap<Pseudo, Property, Ruleset<S>> = new TwoKeyMultiMap(false);

  constructor(parent: S) {
    this.parent = parent;
  }

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param  rule  PostCSS ruleset
   * @param  block  External block
   */
  addRuleset(file: string, rule: postcss.Rule) {
    let style = this.parent;
    let selectors: ParsedSelector[] = style.getParsedSelectors(rule);

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
          let other = style.block.lookup(referenceStr, errLoc);

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
  getRulesets(prop: string, pseudo?: string): Set<Ruleset<S>> {
    if (!pseudo) {
      let res: Ruleset<S>[] = [];
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
  *getAllResolutions(): Iterable<Resolution<Styles>> {
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
