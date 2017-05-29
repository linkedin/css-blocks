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

/**
 * Assert that `obj` is of type `BlockObject`. Throw if not.
 * @param obj BlockObject to test.
 */
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

/**
 * `ConflictResolver` is a utility class that crawls a Block, the block it inherits from,
 * and any other explititly referenced blocks where resolution rules are applied, and
 * resolves property values accordingly.
 */
export default class ConflictResolver {
  readonly opts: OptionsReader;

  constructor(opts: OptionsReader) {
    this.opts = opts;
  }

  /**
   * Given a ruleset and Set of conflicting properties, inject `resolve-inherited`
   * calls for the conflicts for `resolve()` to use later.
   * @param rule  The PostCSS ruleset to operate on.
   * @param conflictingProps  A Set of conflicting property names.
   * @param expression  Expression where property can be found on remote Block.
   * @param handledResolutions  Shared set of handledResolutions
   */
  private resolveInheritedConflict(rule: postcss.Rule, conflictingProps: Set<[string,string]> | undefined, expression: string, handledResolutions: Set<string>) {
    if (!conflictingProps || conflictingProps.size === 0) { return; }
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

  /**
   * Given a ruleset and Block, resolve all conflicts inherited by a parent block.
   * by automatically injecting `resolve-inherited()` calls for conflicting properties.
   * @param root  The PostCSS ruleset to operate on.
   * @param block  The owner block of these rules.
   */
  resolveInheritance(root: postcss.Root, block: Block) {
    let blockBase = block.base;
    let blockBaseName = block.baseName;

    // If this block inherits from another block, walk every ruleset.
    if (blockBase && blockBaseName) {
      root.walkRules((rule) => {

        // These two conflicts caches persist between comma seperated selectors
        // so we don't resolve the same Properties or BlockObject twice in a single pass.
        let handledConflicts = new conflictDetection.Conflicts<string>();
        let handledObjects = new conflictDetection.Conflicts<BlockObject>();

        // For each key selector:
        let parsedSelectors = block.getParsedSelectors(rule);
        parsedSelectors.forEach((sel) => {
          let key = sel.key;

          // Fetch the associated `BlockObject`. If does not exist (ex: malformed selector), skip.
          let blockNode = BlockParser.getBlockNode(key);
          if ( !blockNode ) { return; }
          let obj: BlockObject | undefined = block.nodeAndTypeToBlockObject(blockNode);
          if ( !obj ) { return; }

          // Fetch the set of BlockObject conflicts. If the BlockObject has already
          // been handled, skip.
          let objectConflicts = handledObjects.getConflictSet(key.pseudoelement && key.pseudoelement.value);
          if ( objectConflicts.has(obj) ) { return; }
          objectConflicts.add(obj);

          // Fetch the parent BlockObject this BlockObject inherits from. If none, skip.
          let base = obj.base;
          if ( !base ) { return; }

          // Handle the inheritance conflicts
          let baseSource = base.asSource();
          let conflicts = conflictDetection.detectConflicts(obj, base);
          let handledConflictSet = handledConflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);
          let conflictingProps = conflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);

          // QUESTION: Can I get rid of `resolveInheritedConflict` and inline it here?
          //           Its actually longer and harder to understand with it ripped out.
          this.resolveInheritedConflict(rule, conflictingProps, `${blockBaseName}${baseSource}`, handledConflictSet);
        });
      });
    }
  }

  /**
   * Given a ruleset and Block, resolve all `resolve()` and `resolve-inherited()`
   * calls with the appropriate values from the local block and resolved blocks.
   * @param root  The PostCSS ruleset to operate on.
   * @param block  The owner block of these rules.
   */
  resolve(root: postcss.Root, block: Block) {
    root.walkDecls((decl) => {

      // If value is not `resolve()` or `resolve-inherited()` call, continue.
      let resolveDeclarationMatch = decl.value.match(RESOLVE_RE);
      if (resolveDeclarationMatch === null) { return; }

      let resolveInherited = !!resolveDeclarationMatch[1];
      let referenceStr = resolveDeclarationMatch[3];
      let otherDecls: postcss.Declaration[] = [];
      let isOverride = false;
      let foundOtherValue: number | null = null;
      let foundResolve: number | null = null;

      // Find other resolutions or values for the same property in this block.
      decl.parent.walkDecls(decl.prop, (otherDecl, idx) => {

        // If you encounder the resolve, capture the index and determine if it is a value override.
        if (otherDecl.value.match(RESOLVE_RE)) {
          if (otherDecl.value !== decl.value) { return; }
          foundResolve = idx;
          isOverride = (foundOtherValue !== null);
        }

        // Else, if is a value for this property, capture other decl.
        else {
          // Throw if resolutions are not all before or after values for the same property.
          if (foundOtherValue !== null && foundResolve !== null && foundOtherValue < foundResolve) {
            throw new errors.InvalidBlockSyntax(`Resolving ${decl.prop} must happen either before or after all other values for ${decl.prop}.`, sourceLocation(block.source, decl));
          }
          foundOtherValue = idx;
          otherDecls.push(otherDecl);
        }
      });

      // If no local value found, throw.
      if (foundOtherValue === null) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve ${decl.prop} without a concrete value.`, sourceLocation(block.source, decl));
      }

      // Look up the block that contains the asked resolution.
      let other: BlockObject | undefined = block.lookup(referenceStr);
      assertBlockObject(other, referenceStr, decl.source && decl.source.start);

      // If trying to resolve rule from the same block, throw.
      if (block.equal(other && other.block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with your own block.`, sourceLocation(block.source, decl));
      }

      // If trying to explicitly resolve (aka: not injected inheritance) from an
      // ancestor block, throw.
      else if (!resolveInherited && other && other.block.isAncestor(block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with ancestors of your own block.`, sourceLocation(block.source, decl));
      }

      // Crawl up inheritance tree of the other block and attempt to resolve the
      // conflict at each level.
      let foundConflict = ConflictType.noconflict;
      while (other && foundConflict === ConflictType.noconflict) {
        foundConflict = this.resolveConflictWith(referenceStr, other, decl, otherDecls, isOverride);
        if (foundConflict === ConflictType.noconflict) {
          other = other.base;
        }
      }

      // If no conflicting Declarations were found (aka: calling for a resolution
      // with nothing to resolve), throw error.
      if (foundConflict === ConflictType.noconflict) {
        throw new errors.InvalidBlockSyntax(`There are no conflicting values for ${decl.prop} found in any selectors targeting ${referenceStr}.`, sourceLocation(block.source, decl));
      }

      // Remove resolution Declaration
      decl.remove();
    });
  }

  private resolveConflictWith(
    referenceStr: string,
    other: BlockObject,
    decl: postcss.Declaration,
    otherDecls: postcss.Declaration[],
    isOverride: boolean
  ): ConflictType {
    let curSel = parseSelector((<postcss.Rule>decl.parent).selector); // can't use the cache, it's already been rewritten.
    let prop = decl.prop;
    let root = other.block.root;

    // This should never happen, but it satisfies the compiler.
    if (root === undefined) {
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
