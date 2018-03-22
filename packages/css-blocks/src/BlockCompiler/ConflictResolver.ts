import { assertNever } from "@opticss/util";
import { CompoundSelector, ParsedSelector, parseSelector } from "opticss";
import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");

import { getBlockNode } from "../BlockParser";
import { RESOLVE_RE } from "../BlockSyntax";
import { Block, Style } from "../BlockTree";
import { SourceLocation, sourceLocation } from "../SourceLocation";
import { ResolvedConfiguration } from "../configuration";
import * as errors from "../errors";
import { QueryKeySelector } from "../query";

import { Conflicts, detectConflicts } from "./conflictDetection";

enum ConflictType {
  conflict,
  noConflict,
  sameValues,
}

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const CONTIGUOUS_COMBINATORS = new Set(["+", ">"]);
const NONCONTIGUOUS_COMBINATORS = new Set(["~", " "]);

/**
 * Assert that `obj` is of type `Style`. Throw if not.
 * @param obj Style to test.
 */
function assertStyle(obj: Style | undefined, key: string, source: SourceLocation | undefined): Style {
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
    case ConflictType.noConflict:
      return t2;
    case ConflictType.sameValues:
      switch (t2) {
        case ConflictType.conflict:
          return ConflictType.conflict;
        default:
          return ConflictType.sameValues;
      }
    default:
      return assertNever(t1);
  }
}

/**
 * `ConflictResolver` is a utility class that crawls a Block, the block it inherits from,
 * and any other explicitly referenced blocks where resolution rules are applied, and
 * resolves property values accordingly.
 */
export class ConflictResolver {
  readonly config: ResolvedConfiguration;

  constructor(config: ResolvedConfiguration) {
    this.config = config;
  }

  /**
   * Given a ruleset and Block, resolve all conflicts against the parent block as an override
   * by automatically injecting `resolve-inherited()` calls for conflicting properties.
   * @param root  The PostCSS ruleset to operate on.
   * @param block  The owner block of these rules.
   */
  resolveInheritance(root: postcss.Root, block: Block) {
    let blockBase = block.base;
    let blockBaseName = block.getReferencedBlockLocalName(block.base);

    // If this block inherits from another block, walk every ruleset.
    if (blockBase && blockBaseName) {
      root.walkRules((rule) => {

        // These two conflicts caches persist between comma separated selectors
        // so we don't resolve the same Properties or Style twice in a single pass.
        let handledConflicts = new Conflicts<string>();
        let handledObjects = new Conflicts<Style>();

        // For each key selector:
        let parsedSelectors = block.getParsedSelectors(rule);
        parsedSelectors.forEach((sel) => {
          let key = sel.key;

          // Fetch the associated `Style`. If does not exist (ex: malformed selector), skip.
          let blockNode = getBlockNode(key);
          if (!blockNode) { return; }
          let obj: Style | null = block.nodeAndTypeToStyle(blockNode);
          if (!obj) { return; }

          // Fetch the set of Style conflicts. If the Style has already
          // been handled, skip.
          let objectConflicts = handledObjects.getConflictSet(key.pseudoelement && key.pseudoelement.value);
          if (objectConflicts.has(obj)) { return; }
          objectConflicts.add(obj);

          // Fetch the parent Style this Style inherits from. If none, skip.
          let base = obj.base;
          if (!base) { return; }

          // Handle the inheritance conflicts
          let baseSource = base.asSource();
          let conflicts = detectConflicts(obj, base);
          let handledConflictSet = handledConflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);
          let conflictingProps = conflicts.getConflictSet(key.pseudoelement && key.pseudoelement.value);

          // Given a ruleset and Set of conflicting properties, inject `resolve-inherited`
          // calls for the conflicts for `resolve()` to use later.
          if (!conflictingProps || conflictingProps.size === 0) { return; }
          let ruleProps = new Set<string>();
          rule.walkDecls((decl) => {
            ruleProps.add(decl.prop);
          });
          conflictingProps.forEach(([thisProp, _]) => {
            if (ruleProps.has(thisProp) && !handledConflictSet.has(thisProp)) {
              handledConflictSet.add(thisProp);
              rule.prepend(postcss.decl({prop: thisProp, value: `resolve-inherited("${blockBaseName}${baseSource}")`}));
            }
          });
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

        // If you encounter the resolve, capture the index and determine if it is a value override.
        if (otherDecl.value.match(RESOLVE_RE)) {
          if (otherDecl.value !== decl.value) { return; }
          foundResolve = idx;
          isOverride = (foundOtherValue !== null);
        }

        // Else, if is a value for this property, capture other decl.
        else {
          // Throw if resolutions are not all before or after values for the same property.
          if (foundOtherValue !== null && foundResolve !== null && foundOtherValue < foundResolve) {
            throw new errors.InvalidBlockSyntax(`Resolving ${decl.prop} must happen either before or after all other values for ${decl.prop}.`, this.sourceLocation(block, decl));
          }
          foundOtherValue = idx;
          otherDecls.push(otherDecl);
        }
      });

      // If no local value found, throw.
      if (foundOtherValue === null) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve ${decl.prop} without a concrete value.`, this.sourceLocation(block, decl));
      }

      // Look up the block that contains the asked resolution.
      let other: Style | undefined = block.lookup(referenceStr);
      assertStyle(other, referenceStr, decl.source && decl.source.start);

      // If trying to resolve rule from the same block, throw.
      if (block.equal(other && other.block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with your own block.`, this.sourceLocation(block, decl));
      }

      // If trying to explicitly resolve (aka: not injected inheritance) from an
      // ancestor block, throw.
      else if (!resolveInherited && other && other.block.isAncestorOf(block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with ancestors of your own block.`, this.sourceLocation(block, decl));
      }

      // Crawl up inheritance tree of the other block and attempt to resolve the
      // conflict at each level.
      let foundConflict = ConflictType.noConflict;
      while (other && foundConflict === ConflictType.noConflict) {
        foundConflict = this.resolveConflictWith(referenceStr, other, decl, otherDecls, isOverride);
        if (foundConflict === ConflictType.noConflict) {
          other = other.base;
        }
      }

      // If no conflicting Declarations were found (aka: calling for a resolution
      // with nothing to resolve), throw error.
      if (!resolveInherited && foundConflict === ConflictType.noConflict) {
        throw new errors.InvalidBlockSyntax(`There are no conflicting values for ${decl.prop} found in any selectors targeting ${referenceStr}.`, this.sourceLocation(block, decl));
      }

      // Remove resolution Declaration
      decl.remove();
    });
  }

  private resolveConflictWith(
    referenceStr: string,
    other: Style,
    decl: postcss.Declaration,
    otherDecls: postcss.Declaration[],
    isOverride: boolean,
  ): ConflictType {
    let curSel = parseSelector((<postcss.Rule>decl.parent)); // can't use the cache, it's already been rewritten.
    let prop = decl.prop;
    let root = other.block.stylesheet;

    // This should never happen, but it satisfies the compiler.
    if (root === undefined) {
      throw new TypeError(`Cannot resolve. The block for ${referenceStr} is missing a stylesheet root`);
    }

    // Something to consider: when resolving against a sub-block that has overridden a property, do we need
    // to include the base object selector(s) in the key selector as well?
    let query = new QueryKeySelector(other);
    let result = query.execute(root, other.block);
    let foundConflict: ConflictType = ConflictType.noConflict;
    let resolvedSelectors = new Set<string>();
    curSel.forEach((cs) => {
      let resultSelectors = cs.key.pseudoelement ? result.other[cs.key.pseudoelement.value] : result.main;
      if (!resultSelectors || resultSelectors.length === 0) return;

      // we reverse the selectors because otherwise the insertion order causes them to be backwards from the
      // source order of the target selector
      resultSelectors.reverse().forEach((s) => {
        let newSelectors = this.mergeKeySelectors(other.block.rewriteSelector(s.parsedSelector, this.config), cs);
        if (newSelectors === null) return;
        let newSelStr = newSelectors.join(",\n");
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
          foundConflict = updateConflict(foundConflict, ConflictType.sameValues);
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
          // if it's a yield then we copy the declaration values from the source selector
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
          let parent = decl.parent.parent;
          if (parent) {
            let rule = decl.parent as postcss.Rule;
            parent.insertAfter(rule, newRule);
          }
        }
      });
    });
    return foundConflict;
  }

  /**
   * Splits a CompoundSelector linked list into an array of [ CompoundSelector, Combinator, CompoundSelector ],
   * where the first CompoundSelector is all but the last selector segment.
   * @param s The compound selector to split.
   * @returns [ CompoundSelector, Combinator, CompoundSelector ]
   */
  private splitSelector(s: CompoundSelector): [CompoundSelector | undefined, selectorParser.Combinator | undefined, CompoundSelector] {
    s = s.clone();
    let last = s.removeLast();
    if (last) {
      return [s, last.combinator, last.selector];
    } else {
      return [undefined, undefined, s];
    }
  }

  /**
   * Given two conflicting ParsedSelectors, return a list of selector rules that
   * select elements with both rules present.
   * @param s1 Conflicting ParsedSelector 1.
   * @param s2 Conflicting ParsedSelector 1.
   * @returns A list of ParsedSelector rules that select all possible elements that can have both styles applied.
   */
  private mergeKeySelectors(s1: ParsedSelector, s2: ParsedSelector): ParsedSelector[] {

    // We can not currently handle selectors with more than one combinator.
    if (s1.length > 2 && s2.length > 2) {
      throw new errors.InvalidBlockSyntax(`Cannot resolve selectors with more than 1 combinator at this time [FIXME].`);
    }

    // Split the two combinators into constituent parts.
    let [context1, combinator1, key1] = this.splitSelector(s1.selector);
    let [context2, combinator2, key2] = this.splitSelector(s2.selector);

    // Create the new merged key selector. Ex: ``.foo ~ .bar && .biz > .baz => .bar.baz`
    let mergedKey = key1.clone().mergeNodes(key2);

    // Construct our new conflict-free selector list.
    let mergedSelectors: CompoundSelector[] = [];

    // If both selectors have contexts, we need to do some CSS magic.
    if (context1 && context2 && combinator1 && combinator2) {

      // >, >; +, +
      if (CONTIGUOUS_COMBINATORS.has(combinator1.value) && combinator1.value === combinator2.value) {
        mergedSelectors.push(context1.clone().mergeNodes(context2).append(combinator1, mergedKey));
      }

      // +,>; ~,>; +," "; ~," "
      else if (SIBLING_COMBINATORS.has(combinator1.value) && HIERARCHICAL_COMBINATORS.has(combinator2.value)) {
        mergedSelectors.push(context2.clone().append(combinator2, context1).append(combinator1, mergedKey));
      }

      // >,+; " ",+; >,~; " ",~
      else if (HIERARCHICAL_COMBINATORS.has(combinator1.value) && SIBLING_COMBINATORS.has(combinator2.value)) {
        mergedSelectors.push(context1.clone().append(combinator1, context2).append(combinator2, mergedKey));
      }

      // " "," "; ~,~
      else if (NONCONTIGUOUS_COMBINATORS.has(combinator1.value) && NONCONTIGUOUS_COMBINATORS.has(combinator2.value)) {
        mergedSelectors.push(context1.clone().mergeNodes(context2).append(combinator2, mergedKey));
        mergedSelectors.push(context1.clone().append(combinator1, context2.clone()).append(combinator2, mergedKey.clone()));
        mergedSelectors.push(context2.clone().append(combinator1, context1.clone()).append(combinator2, mergedKey.clone()));
      }

      // " ", >; ~,+
      else if (
           NONCONTIGUOUS_COMBINATORS.has(combinator1.value) && CONTIGUOUS_COMBINATORS.has(combinator2.value)    &&
        ((HIERARCHICAL_COMBINATORS.has(combinator1.value) && HIERARCHICAL_COMBINATORS.has(combinator2.value)) ||
         (SIBLING_COMBINATORS.has(combinator1.value) && SIBLING_COMBINATORS.has(combinator2.value)))
      ) {
        mergedSelectors.push(context1.clone().mergeNodes(context2).append(combinator2, mergedKey));
        mergedSelectors.push(context1.clone().append(combinator1, context2.clone()).append(combinator2, mergedKey.clone()));
      }

      // >, " "; +,~
      else if (
           NONCONTIGUOUS_COMBINATORS.has(combinator2.value) && CONTIGUOUS_COMBINATORS.has(combinator1.value)    &&
        ((HIERARCHICAL_COMBINATORS.has(combinator2.value) && HIERARCHICAL_COMBINATORS.has(combinator1.value)) ||
         (SIBLING_COMBINATORS.has(combinator2.value) && SIBLING_COMBINATORS.has(combinator1.value)))
      ) {
        mergedSelectors.push(context1.clone().mergeNodes(context2).append(combinator1, mergedKey));
        mergedSelectors.push(context2.clone().append(combinator2, context1.clone()).append(combinator1, mergedKey.clone()));
      }

      // We've encountered a use case we don't recognize...
      else {
        throw new errors.InvalidBlockSyntax(`Cannot merge selectors with combinators: '${combinator1.value}' and '${combinator2.value}' [FIXME?].`);
      }
    }

    // If selector 1 has a context, use it as the context for our merged key.
    // Ex: .foo  && .context > .bar => .context > .foo.bar
    else if (context1 && combinator1) {
      mergedSelectors.push(context1.clone().append(combinator1, mergedKey));
    }

    // If selector 2 has a context, use it as the context for our merged key.
    // Ex: .context ~ .foo  && .bar => .context ~ .foo.bar
    else if (context2 && combinator2) {
      mergedSelectors.push(context2.clone().append(combinator2, mergedKey));
    }

    // Otherwise, our merged key *is* our conflict-free selector.
    // Ex: .foo && .bar => .foo.bar
    else {
      mergedSelectors.push(mergedKey);
    }

    // Wrap our list of CompoundSelectors in ParsedSelector containers and return.
    return mergedSelectors.map(sel => new ParsedSelector(sel));
  }
  sourceLocation(block: Block, node: postcss.Node): SourceLocation | undefined {
    let blockPath = this.config.importer.debugIdentifier(block.identifier, this.config);
    return sourceLocation(blockPath, node);
  }
}
