import * as postcss from "postcss";
import * as selectorParser from "postcss-selector-parser";
import { Block, BlockObject } from "./Block";
import * as errors from "./errors";
import { OptionsReader } from "./Options";
import parseSelector, { ParsedSelector, SelectorNode } from "./parseSelector";
import { QueryKeySelector } from "./query";
import { SourceLocation, sourceLocation } from "./SourceLocation";

enum ConflictType {
  conflict,
  noconflict,
  samevalues
}

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

type stringMap = {[combinator: string]: string};
type combinatorMap = {[combinator: string]: stringMap};

const combinatorResolution: combinatorMap = {
  " ": {
    " ": " ",
    ">": ">"
  },
  ">": {
    " ": ">",
    ">": ">"
  },
  "~": {
    "+": "+",
    "~": "~"
  },
  "+": {
    "+": "+",
    "~": "+"
  }
};

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
      result.key.reverse().forEach((s) => {
        let newSels = this.mergeSelectors(other.block.rewriteSelector(s.parsedSelector, this.opts), cs);
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

  private mergeCombinators(c1: SelectorNode| undefined, c2: SelectorNode | undefined): SelectorNode | null | undefined {
    if (c1 === undefined && c2 === undefined) return undefined;
    if (c2 === undefined) return c1;
    if (c1 === undefined) return c2;
    let resultMap = combinatorResolution[c1.value];
    if (resultMap) {
      let result = resultMap[c2.value];
      if (result) {
        return selectorParser.combinator({value: result});
      }
    }
    return null;
  }

  private mergeSelectors(s: ParsedSelector, s2: ParsedSelector): string[] | null {
    if ((s.context && s.context.some(n => n.type === selectorParser.COMBINATOR) && s2.context) ||
        (s2.context && s2.context.some(n => n.type === selectorParser.COMBINATOR) && s.context)) {
          throw new errors.InvalidBlockSyntax(
            `Cannot resolve selectors with more than 1 combinator at this time [FIXME].`);
    }
    let aSels: (SelectorNode | string)[][] = [];
    if (s.context && s2.context) {
      aSels.push(s.context.concat(s2.context));
      aSels.push(s.context.concat([selectorParser.combinator({value: " "})], s2.context));
      aSels.push(s2.context.concat([selectorParser.combinator({value: " "})], s.context));
    } else if (s.context) {
      aSels.push(s.context);
    } else if (s2.context) {
      aSels.push(s2.context);
    }
    let c = this.mergeCombinators(s.combinator, s2.combinator);
    if (c === null) {
      // If combinators can't be merged, the merged selector can't exist, we skip it.
      return null;
    } else {
      if (c !== undefined) {
        let c2: SelectorNode = c;
        aSels.map(aSel => aSel.push(c2));
      }
    }
    if (aSels.length < 1) {
      aSels.push([]);
    }
    aSels = aSels.map(aSel => aSel.concat(s.key));
    aSels = aSels.map(aSel => aSel.concat(s2.key)); // TODO need to filter all pseudos to the end.
    if (s.pseudoelement !== undefined) {
      let pseudoelement: SelectorNode = s.pseudoelement;
      aSels.forEach(aSel => aSel.push(pseudoelement));
    }
    return aSels.map(aSel => aSel.join(''));
  }
}