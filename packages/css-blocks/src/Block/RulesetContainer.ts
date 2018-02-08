import * as postcss from 'postcss';
import * as propParser from 'css-property-parser';
import { MultiMap, TwoKeyMultiMap } from "@opticss/util";
import { Style } from './Block';
import { BLOCK_PROP_NAMES, RESOLVE_RE, SELF_SELECTOR } from "../blockSyntax";
import * as errors from '../errors';
import { sourceLocation } from "../SourceLocation";

// Convenience types to help our code read better.
type Pseudo = string;
type Property = string;

export type Declaration = {
  node: postcss.Declaration,
  value: string,
};

export type Resolution = {
  node: postcss.Rule;
  property: string;
  resolution: Style;
};

export class RuleSet {
  file: string;
  node: postcss.Rule;
  style: Style;

  declarations = new Map<Property, Declaration>();
  resolutions = new MultiMap<Property, Style>();

  constructor(file: string, node: postcss.Rule, style: Style){
    this.file = file;
    this.node = node;
    this.style = style;
  }

  addResolution(property: string, style: Style) {
    let expanded = propParser.expandShorthandProperty(property, 'inherit', true, true);
    for (let prop of Object.keys(expanded)) {
      this.resolutions.set(prop, style);
    }
  }

  hasResolutionFor(property: string, other: Style): boolean {
    return this.resolutions.hasValue(property, other);
  }

}

/**
 * Cache and interface methods for block properties.
 */
export class RulesetContainer {

  private rules: MultiMap<Pseudo, RuleSet> = new MultiMap(false);
  private concerns: TwoKeyMultiMap<Pseudo, Property, RuleSet> = new TwoKeyMultiMap(false);
  // private resolutions: MultiMap<Pseudo, Resolution> = new MultiMap(false);

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param  rule  PostCSS ruleset
   * @param  block  External block
   */
  addRuleset(file: string, rule: postcss.Rule, style: Style) {
    let selectors = style.block.getParsedSelectors(rule);
    selectors.forEach((selector) => {
      let ruleSet = new RuleSet(file, rule, style);
      let key = selector.key;
      let pseudo: string = key.pseudoelement ? key.pseudoelement.toString() : SELF_SELECTOR;

      rule.walkDecls((decl) => {

        // Ignore css-blocks specific prop names.
        if (BLOCK_PROP_NAMES.has(decl.prop)) { return; }

        // Check if this is a resolve statement.
        let referenceStr = (decl.value.match(RESOLVE_RE) || [])[3];

          // If a resolution, track that this property has been resolved
        if (referenceStr) {

          let other = style.block.lookup(referenceStr);

          if (!other) {
            throw new errors.InvalidBlockSyntax(
              `Cannot resolve Style at Block path "${referenceStr}".`,
              sourceLocation(file, decl)
            );
          }

          if ( other.block === style.block ) {
            throw new errors.InvalidBlockSyntax(
              `Cannot resolve conflicts with your own block.`,
              sourceLocation(file, decl)
            );
          }

          if (other && other.block.isAncestorOf(style.block)) {
            throw new errors.InvalidBlockSyntax(
              `Cannot resolve conflicts with ancestors of your own block.`,
              sourceLocation(file, decl)
            );
          }

          // Track the resolution of this property on our RuleSet.
          ruleSet.addResolution(decl.prop, other);
        }

        // If not a resolution, add this as a tracked property on our RuleSet.
        else {
          if (!propParser.isValidDeclaration(decl.prop, decl.value)) { return; }
          let expanded = propParser.expandShorthandProperty(decl.prop, decl.value, true, false);
          expanded[decl.prop] = decl.value;
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
 * Retreive all rulesets that define this Style's behavior.
 * @param  pseudo  Optional pseudo element to get RuleSets for
 * @returns A set of RuleSet objects.
 */
  getRuleSets(prop: string, pseudo = SELF_SELECTOR): Set<RuleSet> {
    return new Set(this.concerns.get(pseudo, prop));
  }

  getAllRuleSets(prop: string): Set<RuleSet> {
    let res: RuleSet[] = [];
    for (let pseudo of this.getPseudos()) {
      res = [...res, ...this.concerns.get(pseudo, prop)];
    }
    return new Set(res);
  }

  /**
   * Retreive a full Set of properties used by any RuleSet that defines this Style.
   * @param  pseudo  Optional pseudo element to get properties from
   * @returns A set of property names.
   */
  getProperties(pseudo = SELF_SELECTOR): Set<string> {
    return new Set([...this.concerns.subkeys(pseudo)]);
  }

  getAllProperties(): Set<string> {
    let res: string[] = [];
    for (let pseudo of this.getPseudos()) {
      res = [...res, ...this.getProperties(pseudo)];
    }
    return new Set(res);
  }

  /**
   * Retrieve all pseudo elements which were found to have properties for this Style.
   * @returns A set of pseudo element names.
   */
  getPseudos(): Set<string> {
    return new Set([...this.concerns.subkeys()]);
  }

  *getAllResolutions(): Iterable<Resolution> {
    let ruleSets = this.rules.individualValues();
    for (let rule of ruleSets) {
      for (let [property, styles] of rule.resolutions) {
        for (let style of styles) {
          yield {
            node: rule.node,
            property,
            resolution: style
          };
        }
      }
    }
  }

}