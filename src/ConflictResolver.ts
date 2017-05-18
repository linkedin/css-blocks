import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");
import { Block, BlockObject } from "./Block";
import * as errors from "./errors";
import { OptionsReader } from "./Options";
import parseSelector, { ParsedSelector, CompoundSelector } from "./parseSelector";
import { QueryKeySelector } from "./query";
import { SourceLocation, sourceLocation } from "./SourceLocation";

enum ConflictType {
  conflict,
  noconflict,
  samevalues
}

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const CONTIGUOUS_COMBINATORS = new Set(["+", ">"]);
const NONCONTIGUOUS_COMBINATORS = new Set(["~", " "]);
const RESOLVE_RE = /resolve\(("|')([^\1]*)\1\)/;

function assertBlockObject(obj: BlockObject | undefined, key: string, source: SourceLocation | undefined): void {
  if (obj === undefined) {
    // TODO: Better value source location for the bad block object reference.
    throw new errors.InvalidBlockSyntax(`Cannot find ${key}`, source);
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

  resolve(root: postcss.Container, block: Block) {
    root.walkDecls((decl) => {
      let resolveDeclarationMatch = decl.value.match(RESOLVE_RE);
      if (resolveDeclarationMatch !== null) {
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
        let referenceStr = resolveDeclarationMatch[2];
        let other: BlockObject | undefined = block.lookup(referenceStr);
        assertBlockObject(other, referenceStr, decl.source.start);
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
    let curSel = parseSelector((<postcss.Rule>decl.parent).selector);
    let prop = decl.prop;
    let root = other.block.root;
    if (root === undefined) {
      // This should never happen, but it satisfies the compiler.
      throw new TypeError(`Cannot resolve. The block for ${referenceStr} is missing a stylesheet root`);
    }
    // Something to consider: when resolving against a subblock that has overridden a property, do we need
    // to include the base object selector(s) in the key selector as well?
    let query = new QueryKeySelector(other);
    let result = query.execute(root);
    let foundConflict: ConflictType = ConflictType.noconflict;
    curSel.forEach((cs) => {
      // we reverse the selectors because otherwise the insertion order causes them to be backwards from the
      // source order of the target selector
      // TODO: handle pseudoelements
      result.main.reverse().forEach((s) => {
        let newSels = this.mergeKeySelectors(other.block.rewriteSelector(s.parsedSelector, this.opts), cs);
        if (newSels === null) return;
        let newRule = postcss.rule({ selector: newSels.join(",\n") });
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
      } else {
        throw new errors.InvalidBlockSyntax(
          `Cannot merge selectors with combinators: ${combinator1.value} and ${combinator2.value} [FIXME?].`);
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