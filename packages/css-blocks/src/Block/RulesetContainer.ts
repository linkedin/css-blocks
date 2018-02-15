import { MultiMap, TwoKeyMultiMap } from "@opticss/util";
import * as propParser from "css-property-parser";
import * as postcss from "postcss";

import { BLOCK_PROP_NAMES, BlockPath, RESOLVE_RE, SELF_SELECTOR } from "../BlockSyntax";
import { sourceLocation } from "../SourceLocation";
import * as errors from "../errors";

import { Style } from "./Block";

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
  resolution: Style;
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
  style: Style;

  declarations = new MultiMap<Property, Declaration>();
  resolutions  = new MultiMap<Property, Style>();

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
  addResolution(property: Property, style: Style): void {
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
  hasResolutionFor(property: Property, other: Style): boolean {
    return this.resolutions.hasValue(property, other);
  }

}

/**
 * Cache and interface methods for all rulesets that may apply to a Style.
 */
export class RulesetContainer {

  // Contains all rulesets that apply to each possible element/pseudo-element target.
  private rules: MultiMap<Pseudo, Ruleset> = new MultiMap(false);

  // Contains all rulesets, accessible by property concern, that apply to each possible element/pseudo-element target.
  private concerns: TwoKeyMultiMap<Pseudo, Property, Ruleset> = new TwoKeyMultiMap(false);

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param  rule  PostCSS ruleset
   * @param  block  External block
   */
  addRuleset(file: string, rule: postcss.Rule, style: Style) {
    let selectors = style.block.getParsedSelectors(rule);
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
        if (referenceStr) {

          let blockPath = new BlockPath(referenceStr);
          let other = style.block.lookup(referenceStr);
          let otherBlock = style.block.getReferencedBlock(blockPath.block);

          if (!otherBlock) {
            throw new errors.InvalidBlockSyntax(
              `No Block named "${blockPath.block}" found in scope.`,
              sourceLocation(file, decl),
            );
          }

          if (!other) {
            throw new errors.InvalidBlockSyntax(
              `No Style "${blockPath.path}" found on Block "${otherBlock.name}".`,
              sourceLocation(file, decl),
            );
          }

          if (other.block === style.block) {
            throw new errors.InvalidBlockSyntax(
              `Cannot resolve conflicts with your own block.`,
              sourceLocation(file, decl),
            );
          }

          if (other && other.block.isAncestorOf(style.block)) {
            throw new errors.InvalidBlockSyntax(
              `Cannot resolve conflicts with ancestors of your own block.`,
              sourceLocation(file, decl),
            );
          }

          ruleSet.addResolution(decl.prop, other);
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
   * Retreive all Rulesets that define this Style's behavior.
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
   * Retreive a full Set of properties used by any Ruleset that defines this Style.
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
