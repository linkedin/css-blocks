import { MultiMap, TwoKeyMultiMap, objectValues } from "@opticss/util";
import * as propParser from "css-property-parser";
import { postcss } from "opticss";

import { AttrValue, BlockClass, Ruleset, Style, isBlockClass } from "../../BlockTree";
import { charInFile } from "../../errors";
import {
  ElementAnalysis,
  isAttrGroup,
  isBooleanAttr,
  isFalseCondition,
  isTrueCondition,
} from "../ElementAnalysis";

import { Validator } from "./Validator";

// Convenience types to help our code read better.
type Pseudo = string;
type Property = string;

type ConflictMap = MultiMap<Property, Ruleset>;
type PropMap = TwoKeyMultiMap<Pseudo, Property, Ruleset>;

/**
 * Add all rulesets from a Style to the supplied PropMap
 * @param  propToBlocks  The PropMap to add properties to.
 * @param  obj  The Style object to track.
 */
function add(propToBlocks: PropMap, obj: Style) {
  for (let pseudo of obj.rulesets.getPseudos()) {
    for (let prop of obj.rulesets.getProperties()) {
      propToBlocks.set(pseudo, prop, ...obj.rulesets.getRulesets(prop, pseudo));
    }
  }
}

/**
 * Test if a given Style object is in conflict with with a PropMap.
 * If the they are in conflict, store the conflicting Styles list in
 * the `conflicts` PropMap.
 * @param  obj  The Style object to we're testing.
 * @param  propToBlocks  The previously encountered properties mapped to the owner Styles.
 * @param  conflicts  Where we store conflicting Style data.
 */
function evaluate(obj: Style, propToRules: PropMap, conflicts: ConflictMap) {

  // Ew! Quadruple for loops! Can we come up with a better way to do this!?
  //  - For each pseudo this Style may effect
  //  - For each property concern of this Style
  //  - For each Ruleset we've already seen associated to this prop
  //  - For each Ruleset relevant to this Style / prop
  for (let pseudo of obj.rulesets.getPseudos()) {
    for (let prop of obj.rulesets.getProperties(pseudo)) {
      for (let other of propToRules.get(pseudo, prop)) {
        for (let self of obj.rulesets.getRulesets(prop, pseudo)) {

          // If these styles are from the same block, abort!
          if (other.style.block === self.style.block) { continue; }

          // If these styles are descendants, abort! This may happen from
          // in-stylesheet composition.
          if (
            other.style.block.isAncestorOf(self.style.block) ||
            self.style.block.isAncestorOf(other.style.block)
          ) { continue; }

          // If one style composes the other somewhere in its hierarchy, abort!
          // This will have been resolved on the base Block, No need to resolve.
          if (
            isBlockClass(other.style) && !other.style.composes(self.style, false) && other.style.composes(self.style) ||
            isBlockClass(self.style) && !self.style.composes(other.style, false) && self.style.composes(other.style)
          ) { continue; }

          // Get the declarations for this specific property.
          let selfDecl = self.declarations.get(prop);
          let otherDecl = other.declarations.get(prop);
          if (!selfDecl || !otherDecl) { continue; }

          // If these declarations have the exact same number of declarations,
          // in the exact same order, or if there is an explicit resolution,
          // ignore it and move on.
          let valuesEqual = selfDecl.length === otherDecl.length;
          if (valuesEqual) {
            for (let i = 0; i < Math.min(selfDecl.length, otherDecl.length); i++) {
              valuesEqual = valuesEqual && selfDecl[i].value === otherDecl[i].value;
            }
          }
          if (valuesEqual ||
            other.hasResolutionFor(prop, self.style) ||
            self.hasResolutionFor(prop, other.style)
          ) { continue; }

          // Otherwise, we found an unresolved conflict!
          conflicts.set(prop, other);
          conflicts.set(prop, self);
        }
      }
    }
  }
}

/**
 * For every shorthand property in our conflicts map, remove all its possible longhand
 * expressions that are set to the same value. Do this recursively to catch shorthands
 * that expand to other shorthands.
 * @param  prop  The property we're pruning.
 * @param  conflicts  The ConflictMap we're modifying.
 */
function recursivelyPruneConflicts(prop: string, conflicts: ConflictMap): Ruleset[] {
  if (propParser.isShorthandProperty(prop)) {
    let longhands = propParser.expandShorthandProperty(prop, "inherit", false, true);
    for (let longProp of Object.keys(longhands)) {
      let rules = recursivelyPruneConflicts(longProp, conflicts);
      for (let rule of rules) {
        if (conflicts.hasValue(prop, rule)) {
          conflicts.deleteValue(longProp, rule);
        }
      }
    }
  }
  return conflicts.get(prop);
}

/**
 * Simple print function for a ruleset conflict error message.
 * @param  prop  The property we're printing on this Ruleset.
 * @param  rule  The Ruleset we're printing.
 */
function formatRulesetConflicts(prop: string, rules: Ruleset<Style>[]) {
  const out = new Set();
  for (let rule of rules) {
    let decl = rule.declarations.get(prop);
    let nodes: postcss.Rule[] | postcss.Declaration[] =  decl ? decl.map((d) => d.node) : [rule.node];
    for (let node of nodes) {
      out.add(`    ${rule.style.asSource(true)} (${charInFile(rule.file, node.source && node.source.start)})`);
    }
  }
  return [...out].join("\n");
}

function inStylesheetComposition(
  blockClass: BlockClass,
  analysis: ElementAnalysis<unknown, unknown, unknown>,
  conflicts: ConflictMap,
  allConditions: PropMap,
) {
  composed: for (let composed of blockClass.composedStyles()) {
    for (let condition of composed.conditions) {
      if (!analysis.hasAttribute(condition)) { break composed; }
    }
    evaluate(composed.style, allConditions, conflicts);
    add(allConditions, composed.style);
  }
}

/**
 * Prevent conflicting styles from being applied to the same element without an explicit resolution.
 * @param correlations The correlations object for a given element.
 * @param err Error callback.
 */
export const propertyConflictValidator: Validator = (elAnalysis, _templateAnalysis, err) => {

  // Conflicting RuseSets stored here.
  let conflicts: ConflictMap = new MultiMap(false);

  // Storage for previously encountered Styles
  let allConditions: PropMap = new TwoKeyMultiMap(false);

  // For each static style, evaluate it and add it to the static store.
  elAnalysis.static.forEach((obj) => {
    evaluate(obj, allConditions, conflicts);
    add(allConditions, obj);

    // TODO: When we unify Element Analysis and Stylesheet Composition concepts, this check
    //       can happen in another location during the BlockParse instead of Template Validation.
    if (isBlockClass(obj)) { inStylesheetComposition(obj, elAnalysis, conflicts, allConditions); }
  });

  // For each dynamic class, test it against the static classes,
  // and independently compare the mutually exclusive truthy
  // and falsy conditions. Once done, merge all concerns into the
  // static store.
  elAnalysis.dynamicClasses.forEach((condition) => {
    let truthyConditions: PropMap = new TwoKeyMultiMap(false);
    let falsyConditions: PropMap = new TwoKeyMultiMap(false);

    if (isTrueCondition(condition)) {
      condition.whenTrue.forEach((obj) => {
        evaluate(obj, allConditions, conflicts);
        evaluate(obj, truthyConditions, conflicts);
        add(truthyConditions, obj);
      });
    }
    if (isFalseCondition(condition)) {
      condition.whenFalse.forEach((obj) => {
        evaluate(obj, allConditions, conflicts);
        evaluate(obj, falsyConditions, conflicts);
        add(falsyConditions, obj);
      });
    }

    allConditions.setAll(truthyConditions);
    allConditions.setAll(falsyConditions);

  });

  // For each dynamic AttrValue, process those in their Attributes independently,
  // as they are mutually exclusive. Boolean Attributes are evaluated directly.
  elAnalysis.dynamicAttributes.forEach((condition) => {
    if (isAttrGroup(condition)) {
      let attrConditions: PropMap = new TwoKeyMultiMap(false);
      for (let attr of objectValues(condition.group)) {
        evaluate(attr, allConditions, conflicts);
        add(attrConditions, attr);
      }
      allConditions.setAll(attrConditions);
    }

    else if (isBooleanAttr(condition)) {
      for (let val of condition.value) {
        evaluate(val as AttrValue, allConditions, conflicts);
        add(allConditions, val as AttrValue);
      }
    }
  });

  // Prune longhand conflicts that are properly covered by shorthand conflict reports.
  for (let prop of conflicts.keys()) {
    if (propParser.isShorthandProperty(prop)) { recursivelyPruneConflicts(prop, conflicts); }
  }

  // For every set of conflicting properties, throw the error.
  if (conflicts.size) {
    let msg = "The following property conflicts must be resolved for these composed Styles:";
    let details = "\n";
    for (let [prop, matches] of conflicts.entries()) {
      if (!prop || !matches.length) { return; }
      details += `  ${prop}:\n${formatRulesetConflicts(prop, matches)}\n\n`;
    }
    err(msg, null, details);
  }

};
