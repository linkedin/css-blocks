import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");
import { Block, BlockObject } from "./Block";
import BlockParser from "./BlockParser";
import * as errors from "./errors";
import { OptionsReader } from "./options";
import parseSelector, { ParsedSelector, CompoundSelector } from "./parseSelector";
import { QueryKeySelector } from "./query";
import { SourceLocation, sourceLocation } from "./SourceLocation";
import * as conflictDetection from "./conflictDetection";

enum ConflictType {
  conflict,
  noconflict,
  samevalues
}

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const CONTIGUOUS_COMBINATORS = new Set(["+", ">"]);
const NONCONTIGUOUS_COMBINATORS = new Set(["~", " "]);
const RESOLVE_RE = /resolve(-inherited)?\(("|')([^\2]*)\2\)/;

function assertBlockObject(obj: BlockObject | undefined, key: string, source: SourceLocation | undefined): BlockObject {
  if (obj === undefined) {
    // TODO: Better value source location for the bad block object reference.
    throw new errors.InvalidBlockSyntax(`Cannot find ${key}`, source);
  } else {
    return obj;
  }
}

function updateConflict(t1: ConflictType, t2: ConflictType): ConflictType {
  switch (t1) {
    case ConflictType.conflict:
      return ConflictType.conflict;
    case ConflictType.noconflict:
      return t2;
    case ConflictType.samevalues:
      switch (t2) {
        case ConflictType.conflict:
          return ConflictType.conflict;
        default:
          return ConflictType.samevalues;
      }
  }
}

export default class ConflictResolver {
  readonly opts: OptionsReader;

  constructor(opts: OptionsReader) {
    this.opts = opts;
  }

  private resolveInheritedConflict(rule: postcss.Rule, conflictingProps: Set<[string,string]> | undefined, expression: string, handledResolutions: Set<string>) {
    if (conflictingProps && conflictingProps.size > 0) {
      let ruleProps = new Set<string>();
      rule.walkDecls((decl) => {
        ruleProps.add(decl.prop);
      });
      conflictingProps.forEach(([thisProp, _]) => {
        if (ruleProps.has(thisProp) && !handledResolutions.has(thisProp)) {
          handledResolutions.add(thisProp);
          rule.prepend(postcss.decl({prop: thisProp, value: `resolve-inherited("${expression}")`}));
        }
      });
    }
  }

  resolveInheritance(root: postcss.Root, block: Block) {
    let blockBase = block.base;
    let blockBaseName = block.baseName;
    if (blockBase && blockBaseName) {
      root.walkRules((rule) => {
        let parsedSelectors = block.getParsedSelectors(rule);
        let handledConflicts = new conflictDetection.Conflicts<string>();
        let handledObjects = new conflictDetection.Conflicts<BlockObject>();
        parsedSelectors.forEach((sel) => {
          let key = sel.key;
          let blockNode = BlockParser.getBlockNode(key);
          if (blockNode) {
            let obj = block.nodeAndTypeToBlockObject(blockNode);
            if (obj) {
              let objectConflicts = handledObjects.getConflictSet(key.pseudoelement && key.pseudoelement.value);
              if (!objectConflicts.has(obj)) {
                objectConflicts.add(obj);
                let base = obj.base;
                if (base) {
                  let baseSource = base.asSource();
                  let conflicts = conflictDetection.detectConflicts(obj, base);
                  let handledConflictSet = handledConflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);
                  let conflictingProps = conflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);
                  this.resolveInheritedConflict(rule, conflictingProps, `${blockBaseName}${baseSource}`, handledConflictSet);
                }
              }
            }
          }
        });
      });
    }
  }

  resolve(root: postcss.Root, block: Block) {
    root.walkDecls((decl) => {
      let resolveDeclarationMatch = decl.value.match(RESOLVE_RE);
      if (resolveDeclarationMatch !== null) {
        let resolveInherited = !!resolveDeclarationMatch[1];
        let otherDecls: postcss.Declaration[] = [];
        let isOverride = false;
        let foundOtherValue: number | null = null;
        let foundResolve: number | null = null;
        decl.parent.walkDecls(decl.prop, (otherDecl, idx) => {
          if (otherDecl.value.match(RESOLVE_RE)) {
            // Ignore other resolutions.
            if (otherDecl.value === decl.value) {
              foundResolve = idx;
              if (foundOtherValue !== null) {
                isOverride = true;
              }
            }
          } else {
            if (foundOtherValue !== null && foundResolve !== null && foundOtherValue < foundResolve) {
              throw new errors.InvalidBlockSyntax(`Resolving ${decl.prop} must happen either before or after all other values for ${decl.prop}.`,
                                                  sourceLocation(block.source, decl));
            }
            foundOtherValue = idx;
            otherDecls.push(otherDecl);
          }
        });
        if (foundOtherValue === null) {
          throw new errors.InvalidBlockSyntax(`Cannot resolve ${decl.prop} without a concrete value.`, sourceLocation(block.source, decl));
        }
        let referenceStr = resolveDeclarationMatch[3];
        let other: BlockObject | undefined = block.lookup(referenceStr);
        assertBlockObject(other, referenceStr, decl.source && decl.source.start);
        if (block.equal(other && other.block)) {
          throw new errors.InvalidBlockSyntax(
            `Cannot resolve conflicts with your own block.`,
            sourceLocation(block.source, decl));
        } else if (!resolveInherited && other && other.block.isAncestor(block)) {
          throw new errors.InvalidBlockSyntax(
            `Cannot resolve conflicts with ancestors of your own block.`,
            sourceLocation(block.source, decl));
        }
        let foundConflict = ConflictType.noconflict;
        while (other && foundConflict === ConflictType.noconflict) {
          foundConflict = this.resolveConflictWith(referenceStr, other, isOverride, decl, otherDecls);
          if (foundConflict === ConflictType.noconflict) {
            other = other.base;
          }
        }

        if (foundConflict === ConflictType.noconflict) {
          throw new errors.InvalidBlockSyntax(
            `There are no conflicting values for ${decl.prop} found in any selectors targeting ${referenceStr}.`,
            sourceLocation(block.source, decl));
        }
        decl.remove();
      }
    });
  }

  private resolveConflictWith(
    referenceStr: string,
    other: BlockObject,
    isOverride: boolean,
    decl: postcss.Declaration,
    otherDecls: postcss.Declaration[]
  ): ConflictType {
    let curSel = parseSelector((<postcss.Rule>decl.parent).selector); // can't use the cache, it's already been rewritten.
    let prop = decl.prop;
    let root = other.block.root;
    if (root === undefined) {
      // This should never happen, but it satisfies the compiler.
      throw new TypeError(`Cannot resolve. The block for ${referenceStr} is missing a stylesheet root`);
    }
    // Something to consider: when resolving against a subblock that has overridden a property, do we need
    // to include the base object selector(s) in the key selector as well?
    let query = new QueryKeySelector(other);
    let result = query.execute(root, other.block);
    let foundConflict: ConflictType = ConflictType.noconflict;
    let resolvedSelectors = new Set<string>();
    curSel.forEach((cs) => {
      let resultSels = cs.key.pseudoelement ? result.other[cs.key.pseudoelement.value] : result.main;
      if (!resultSels || resultSels.length === 0) return;

      // we reverse the selectors because otherwise the insertion order causes them to be backwards from the
      // source order of the target selector
      resultSels.reverse().forEach((s) => {
        let newSels = this.mergeKeySelectors(other.block.rewriteSelector(s.parsedSelector, this.opts), cs);
        if (newSels === null) return;
        let newSelStr = newSels.join(",\n");
        // avoid duplicate selector via permutation
        if (resolvedSelectors.has(newSelStr)) return;
        resolvedSelectors.add(newSelStr);
        let newRule = postcss.rule({ selector: newSelStr });
        // check if the values are the same, skip resolution for this selector if they are.
        let d = 0;
        let sameValues = true;
        s.rule.walkDecls(decl.prop, (overrideDecl) => {
          if (!overrideDecl.value.match(RESOLVE_RE)) {
            if (otherDecls.length === d || overrideDecl.value !== otherDecls[d++].value) {
              sameValues = false;
              return false;
            }
          }
          return true;
        });
        if (sameValues && otherDecls.length === d) { // check length in case there was an extra otherDecl
          foundConflict = updateConflict(foundConflict, ConflictType.samevalues);
          return;
        }
        // If it's an override we copy the declaration values from the target into the selector
        if (isOverride) {
          s.rule.walkDecls(decl.prop, (overrideDecl) => {
            if (!overrideDecl.value.match(RESOLVE_RE)) {
              foundConflict = updateConflict(foundConflict, ConflictType.conflict);
              newRule.append(postcss.decl({ prop: prop, value: overrideDecl.value }));
            }
          });
        } else {
          // if it's an underride then we copy the declaration values from the source selector
          // TODO combine this iteration with the same value check above.
          let foundSelConflict = false;
          s.rule.walkDecls(decl.prop, (overrideDecl) => {
            if (!overrideDecl.value.match(RESOLVE_RE)) {
              foundConflict = updateConflict(foundConflict, ConflictType.conflict);
              foundSelConflict = true;
            }
          });
          // if the conflicting properties are set copy
          if (foundSelConflict) {
            otherDecls.forEach((otherDecl) => {
              newRule.append(postcss.decl({ prop: prop, value: otherDecl.value }));
            });
          }
        }
        // don't create an empty ruleset.
        if (newRule.nodes && newRule.nodes.length > 0) {
          decl.parent.parent.insertAfter(decl.parent, newRule);
        }
      });
    });
    return foundConflict;
  }

  private splitSelector(s: CompoundSelector): [CompoundSelector | undefined, selectorParser.Combinator | undefined, CompoundSelector] {
    s = s.clone();
    let last = s.removeLast();
    if (last) {
      return [s, last.combinator, last.selector];
    } else {
      return [undefined, undefined, s];
    }
  }

  private mergeKeySelectors(s1: ParsedSelector, s2: ParsedSelector): ParsedSelector[] {
   if (s1.length > 2 && s2.length > 2) {
      throw new errors.InvalidBlockSyntax(
        `Cannot resolve selectors with more than 1 combinator at this time [FIXME].`);
    }
    let [context1, combinator1, key1] = this.splitSelector(s1.selector);
    let [context2, combinator2, key2] = this.splitSelector(s2.selector);

    let mergedKey = key1.clone().mergeNodes(key2);

    let mergedSels: CompoundSelector[] = [];
    if (context1 && context2 && combinator1 && combinator2) {
      if (CONTIGUOUS_COMBINATORS.has(combinator1.value) && combinator1.value === combinator2.value) { // >, >; +, +
        mergedSels.push(context1.clone().mergeNodes(context2).append(combinator1, mergedKey));
      } else if (SIBLING_COMBINATORS.has(combinator1.value) && HIERARCHICAL_COMBINATORS.has(combinator2.value)) { // +,>; ~,>; +," "; ~," "
        mergedSels.push(context2.clone().append(combinator2, context1).append(combinator1, mergedKey));
      } else if (HIERARCHICAL_COMBINATORS.has(combinator1.value) && SIBLING_COMBINATORS.has(combinator2.value)) { // >,+; " ",+; >,~; " ",~
        mergedSels.push(context1.clone().append(combinator1, context2).append(combinator2, mergedKey));
      } else if (NONCONTIGUOUS_COMBINATORS.has(combinator1.value) && NONCONTIGUOUS_COMBINATORS.has(combinator2.value)) { // " "," "; ~,~
        mergedSels.push(context1.clone().mergeNodes(context2).append(combinator2, mergedKey));
        mergedSels.push(context1.clone().append(combinator1, context2.clone()).append(combinator2, mergedKey.clone()));
        mergedSels.push(context2.clone().append(combinator1, context1.clone()).append(combinator2, mergedKey.clone()));
      } else if (NONCONTIGUOUS_COMBINATORS.has(combinator1.value) && CONTIGUOUS_COMBINATORS.has(combinator2.value) &&
                 ((HIERARCHICAL_COMBINATORS.has(combinator1.value) && HIERARCHICAL_COMBINATORS.has(combinator2.value)) ||
                  (SIBLING_COMBINATORS.has(combinator1.value) && SIBLING_COMBINATORS.has(combinator2.value)))) { // " ", >; ~,+
        mergedSels.push(context1.clone().mergeNodes(context2).append(combinator2, mergedKey));
        mergedSels.push(context1.clone().append(combinator1, context2.clone()).append(combinator2, mergedKey.clone()));
      } else if (NONCONTIGUOUS_COMBINATORS.has(combinator2.value) && CONTIGUOUS_COMBINATORS.has(combinator1.value) &&
                 ((HIERARCHICAL_COMBINATORS.has(combinator2.value) && HIERARCHICAL_COMBINATORS.has(combinator1.value)) ||
                  (SIBLING_COMBINATORS.has(combinator2.value) && SIBLING_COMBINATORS.has(combinator1.value)))) { // >, " "; +,~
        mergedSels.push(context1.clone().mergeNodes(context2).append(combinator1, mergedKey));
        mergedSels.push(context2.clone().append(combinator2, context1.clone()).append(combinator1, mergedKey.clone()));
      } else {
        throw new errors.InvalidBlockSyntax(
          `Cannot merge selectors with combinators: '${combinator1.value}' and '${combinator2.value}' [FIXME?].`);
      }
    } else if (context1 && combinator1) {
      mergedSels.push(context1.clone().append(combinator1, mergedKey));
    } else if (context2 && combinator2) {
      mergedSels.push(context2.clone().append(combinator2, mergedKey));
    } else {
      mergedSels.push(mergedKey);
    }
    return mergedSels.map(sel => new ParsedSelector(sel));
  }
}
