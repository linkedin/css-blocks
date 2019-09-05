import { assertNever } from "@opticss/util";
import { CompoundSelector, ParsedSelector, parseSelector, postcss, postcssSelectorParser as selectorParser } from "opticss";

import { isAttributeNode, isClassNode, isRootNode, toAttrToken } from "../BlockParser";
import { Resolution, getResolution, isResolution } from "../BlockSyntax";
import { Block, BlockClass, Style } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";
import * as errors from "../errors";
import { QueryKeySelector } from "../query";
import { SourceFile, SourceRange, sourceRange } from "../SourceLocation";
import { expandProp } from "../util/propertyParser";

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

interface ResolutionDecls {
  decl: postcss.Declaration;
  resolution: Resolution;
  isOverride: boolean;
  localDecls: SimpleDecl[];
}

interface SimpleDecl {
  prop: string;
  value: string;
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

    // If this block inherits from another block, walk every rule set.
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
          let obj: Style | null = null;
          let container: BlockClass | null;

          // Fetch the associated `Style`. If does not exist (ex: malformed selector), skip.
          for (let node of key.nodes) {
            if (isRootNode(node)) {
              container = obj = block.rootClass;
            }
            if (isClassNode(node)) {
              container = obj = block.getClass(node.value);
            }
            else if (isAttributeNode(node)) {
              obj = container!.getAttributeValue(toAttrToken(node));
            }
          }

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

          // Given a rule set and Set of conflicting properties, inject `resolve-inherited`
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
    const resolutions: Set<ResolutionDecls> = new Set();

    root.walkDecls((decl) => {
      if (!isResolution(decl.value)) { return; }
      resolutions.add({
        decl,
        resolution: getResolution(decl.value),
        isOverride: false,
        localDecls: [],
      });
    });

    resolutions.forEach((res) => {

      const { decl, resolution, localDecls } = res;

      // Expand the property to all its possible representations.
      let propExpansion = expandProp(decl.prop, decl.value);
      let foundRes = false;
      decl.parent.walkDecls(({ prop, value }) => {
        // If this is the same resolution declaration, and no local decls
        // have been found, this is an override resolution.
        if (value === decl.value) {
          foundRes = (localDecls.length === 0) ? false : true;
          res.isOverride = (localDecls.length === 0);
        }

        // If this property isn't a concern of the resolution, or is a resolution itself, skip.
        if (isResolution(value) || !propExpansion[prop]) { return; }

        // Throw if resolutions are not all before or after values for the same property.
        if (localDecls.length && foundRes) {
          throw new errors.InvalidBlockSyntax(`Resolving ${decl.prop} must happen either before or after all other values for ${decl.prop}.`, this.sourceRange(block, decl));
        }

        // Save the applicable local decl.
        localDecls.push({ prop, value });
      });

      // If no local declarations found setting this value, throw.
      if (!localDecls.length) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve ${decl.prop} without a concrete value.`, this.sourceRange(block, decl));
      }

      // Look up the block that contains the requested resolution.
      let other: Style | undefined = block.lookup(resolution.path);
      if (!other) {
        throw new errors.InvalidBlockSyntax(`Cannot find ${resolution.path}`, this.sourceRange(block, decl));
      }

      // If trying to resolve rule from the same block, throw.
      if (block.equal(other && other.block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with your own block.`, this.sourceRange(block, decl));
      }

      // If trying to resolve (read: not inheritance resolution) from an ancestor block, throw.
      else if (!resolution.isInherited && other && other.block.isAncestorOf(block)) {
        throw new errors.InvalidBlockSyntax(`Cannot resolve conflicts with ancestors of your own block.`, this.sourceRange(block, decl));
      }

      // Crawl up inheritance tree of the other block and attempt to resolve the conflict at each level.
      let foundConflict = ConflictType.noConflict;
      do {
        foundConflict = this.resolveConflictWith(resolution.path, other, res);
        other = other.base;
      } while (other && foundConflict === ConflictType.noConflict);

      // If no conflicting Declarations were found (aka: calling for a resolution
      // with nothing to resolve), throw error.
      if (!resolution.isInherited && foundConflict === ConflictType.noConflict) {
        throw new errors.InvalidBlockSyntax(`There are no conflicting values for ${decl.prop} found in any selectors targeting ${resolution.path}.`, this.sourceRange(block, decl));
      }

      // Remove resolution Declaration. Do after traversal because otherwise we mess up postcss' iterator.
      decl.remove();
    });
  }

  private resolveConflictWith(
    referenceStr: string,
    other: Style,
    resolution: ResolutionDecls,
  ): ConflictType {
    const { decl, localDecls, isOverride } = resolution;

    const root = other.block.stylesheet;
    const curSel = parseSelector((<postcss.Rule>decl.parent)); // can't use the cache, it's already been rewritten.

    // This should never happen, but it satisfies the compiler.
    if (root === undefined) {
      throw new TypeError(`Cannot resolve. The block for ${referenceStr} is missing a stylesheet root`);
    }

    // Something to consider: when resolving against a sub-block that has overridden a property, do we need
    // to include the base object selector(s) in the key selector as well?
    const resolvedSelectors = new Set<string>();
    const query = new QueryKeySelector(other);
    const result = query.execute(root, other.block);
    let foundConflict: ConflictType = ConflictType.noConflict;

    for (let cs of curSel) {
      let resultSelectors = cs.key.pseudoelement ? result.other[cs.key.pseudoelement.value] : result.main;
      if (!resultSelectors || resultSelectors.length === 0) continue;

      // we reverse the selectors because otherwise the insertion order causes them to be backwards from the
      // source order of the target selector
      for (let s of resultSelectors.reverse()) {
        let newSelectors = this.mergeKeySelectors(other.block.rewriteSelector(s.parsedSelector, this.config), cs);
        if (newSelectors === null) { continue; }

        // avoid duplicate selector via permutation
        let newSelStr = newSelectors.join(",\n");
        if (resolvedSelectors.has(newSelStr)) { continue; }
        resolvedSelectors.add(newSelStr);
        let newRule = postcss.rule({ selector: newSelStr });

        // For every declaration in the other ruleset,
        const remoteDecls: SimpleDecl[] = [];
        s.rule.walkDecls((overrideDecl): true | void => {
          // If this is another resolution, skip. This resolution handles it.
          if (isResolution(overrideDecl.value)) { return true; }

          // Expand the property to all its possible representations.
          let propExpansion = expandProp(overrideDecl.prop, overrideDecl.value);

          // If these properties no not match, skip.
          if (!propExpansion[decl.prop]) {
            let localPropExpansion = expandProp(decl.prop, decl.value);
            let discovered = false;
            for (let prop of Object.keys(localPropExpansion)) {
              discovered = discovered || !!propExpansion[prop];
            }
            if (!discovered) { return true; }
          }

          // Save the remote decl values in order discovered.
          remoteDecls.push({ prop: decl.prop, value: propExpansion[decl.prop] });
        });

        // If no applicable attributes on the other selector, return as not in conflict.
        if (!remoteDecls.length) { continue; }

        // Check if all the values are the same, skip resolution for this selector if they are.
        if (localDecls.length === remoteDecls.length) {
          // TODO: Better list comparison here, this is dirty.
          if (localDecls.reduce((c, d) => `${c}${d.prop}:${d.value};`, "") === remoteDecls.reduce((c, d) => `${c}${d.prop}:${d.value};`, "")) {
            foundConflict = updateConflict(foundConflict, ConflictType.sameValues);
            continue;
          }
        }

        // Add all found declarations to the new rule.
        foundConflict = updateConflict(foundConflict, ConflictType.conflict);
        for (let {prop, value} of isOverride ? localDecls : remoteDecls) {
          newRule.append(postcss.decl({ prop, value }));
        }

        // Insert the new rule.
        if (newRule.nodes && newRule.nodes.length > 0) {
          let parent = decl.parent.parent;
          if (parent) {
            let rule = decl.parent as postcss.Rule;
            parent.insertAfter(rule, newRule);
          }
        }
      }
    }
    return foundConflict;
  }

  /**
   * Splits a CompoundSelector linked list into an array of [ CompoundSelector, Combinator, CompoundSelector ],
   * where the first CompoundSelector is all but the last selector segment.
   * @param s The compound selector to split.
   * @returns [ CompoundSelector, Combinator, CompoundSelector ]
   */
  private splitSelector(s: CompoundSelector): [CompoundSelector, selectorParser.Combinator, CompoundSelector] | [undefined, undefined, CompoundSelector] {
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
   * @param s2 Conflicting ParsedSelector 2.
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

      // If both selectors use the `>` or `+` combinator, combine the contexts.
      // Ex: `.foo + .foo` and `.bar + .bar` => `.foo.bar + .foo.bar`
      if (CONTIGUOUS_COMBINATORS.has(combinator1.value) && combinator1.value === combinator2.value) {
        mergedSelectors.push(context1.clone().mergeNodes(context2).append(combinator1, mergedKey));
      }

      // If selector 1 uses `+` or `~` and selector 2 uses ` ` or `>`, place the hierarchical combinator first.
      // Ex: `.foo + .foo` and `.biz > .baz` => `.biz > .foo + .foo.baz + .foo.bar`
      else if (SIBLING_COMBINATORS.has(combinator1.value) && HIERARCHICAL_COMBINATORS.has(combinator2.value)) {
        mergedSelectors.push(context2.clone().append(combinator2, context1).append(combinator1, mergedKey));
      }

      // Reverse of above.
      // If selector 2 uses `+` or `~` and selector 1 uses ` ` or `>`, place the hierarchical combinator first.
      // Ex: `.biz > .baz` and `.foo + .foo` => `.biz > .foo + .foo.baz + .foo.bar`
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
    return mergedSelectors.map(sel => new ParsedSelector(sel, sel.toString()));
  }
  sourceRange(block: Block, node: postcss.Node): SourceRange | SourceFile | undefined {
    let blockPath = this.config.importer.debugIdentifier(block.identifier, this.config);
    return sourceRange(this.config, block.stylesheet, blockPath, node);
  }
}
