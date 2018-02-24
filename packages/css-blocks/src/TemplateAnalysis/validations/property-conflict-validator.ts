import { MultiMap, objectValues, TwoKeyMultiMap } from "@opticss/util";
import * as propParser from "css-property-parser";
import * as postcss from "postcss";

import { Style } from "../../Block";
import { Ruleset } from "../../Block/BlockTree/RulesetContainer";
import {
  isBooleanState,
  isFalseCondition,
  isStateGroup,
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
function printRulesetConflict(prop: string, rule: Ruleset) {
  let decl = rule.declarations.get(prop);
  let nodes: postcss.Rule[] | postcss.Declaration[] =  decl ? decl.map((d) => d.node) : [rule.node];
  let out = [];
  for (let node of nodes) {
    let line = node.source.start && `:${node.source.start.line}`;
    let column = node.source.start && `:${node.source.start.column}`;
    out.push(`    ${rule.style.block.name}${rule.style.asSource()} (${rule.file}${line}${column})`);
  }
  return out.join("\n");
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

  // For each dynamic state, process those in state groups independently,
  // as they are mutually exclusive. Boolean states are evaluated directly.
  elAnalysis.dynamicStates.forEach((condition) => {
    if (isStateGroup(condition)) {
      let stateConditions: PropMap = new TwoKeyMultiMap(false);
      for (let state of objectValues(condition.group)) {
        evaluate(state, allConditions, conflicts);
        add(stateConditions, state);
      }
      allConditions.setAll(stateConditions);
    }

    else if (isBooleanState(condition)) {
      evaluate(condition.state, allConditions, conflicts);
      add(allConditions, condition.state);
    }
  });

  // Prune longhand conflicts that are properly covered by shorthand conflict reports.
  for (let prop of conflicts.keys()) {
    if (propParser.isShorthandProperty(prop)) { recursivelyPruneConflicts(prop, conflicts); }
  }

  // For every set of conflicting properties, throw the error.
  if (conflicts.size) {
    let msg = "The following property conflicts must be resolved for these co-located Styles:";
    let details = "\n";
    for (let [prop, matches] of conflicts.entries()) {
      if (!prop || !matches.length) { return; }
      details += `  ${prop}:\n${matches.map((m) => printRulesetConflict(prop, m)).join("\n")}\n\n`;
    }
    err(msg, null, details);
  }

};
