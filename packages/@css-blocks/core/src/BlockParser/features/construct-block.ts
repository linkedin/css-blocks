import { CompoundSelector, ParsedSelector, postcss, postcssSelectorParser as selectorParser } from "opticss";

import { BLOCK_ALIAS } from "../../BlockSyntax";
import { AttrValue, Block, BlockClass, Style } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { selectorSourceRange as range, sourceRange } from "../../SourceLocation";
import {
  BlockType,
  NodeAndType,
  blockTypeName,
  getStyleTargets,
  isAttributeNode,
  isClassLevelObject,
  isClassNode,
  isExternalBlock,
  isRootLevelObject,
  isRootNode,
} from "../block-intermediates";
import { stripQuotes } from "../utils";

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const LEGAL_COMBINATORS = new Set(["+", "~", " ", ">"]);

/**
 * Should this selector be parsed as a block selector?
 * Right now, only ignore selectors in @keyframes blocks.
 * @param rule  The postcss rule to evaluate.
 * @returns If this is a block selector or not.
 **/
function shouldBeParsedAsBlockSelector(rule: postcss.Rule): boolean {
  return !(rule.parent && rule.parent.type === "atrule" && (rule.parent).name === "keyframes");
}

/**
 * Pull getParsedSelectors try-catch out to prevent de-opt of main walkRules function.
 * @param block Block  The block to fetch ParsedSelectors from.
 * @param rule  postcss.Rule  The postcss rule to parse.
 * @param file  string  The filepath of the file we are parsing for error reporting.
 * @returns The ParsedSelector array.
 **/
function getParsedSelectors(configuration: Configuration, block: Block, rule: postcss.Rule, file: string): ParsedSelector[] {
  let res;
  try { res = block.getParsedSelectors(rule); }
  catch (e) { throw new errors.InvalidBlockSyntax(e.message, sourceRange(configuration, block.stylesheet, file, rule)); }
  return res;
}

export async function constructBlock(configuration: Configuration, root: postcss.Root, block: Block, file: string): Promise<Block> {

  let styleRuleTuples: Set<[Style, postcss.Rule]> = new Set();

  // For each rule in this Block
  root.walkRules((rule) => {

    // Abort if is not a block rule.
    if (!shouldBeParsedAsBlockSelector(rule)) { return; }

    // Fetch the parsed selectors list. Throw a helpful error if we can't parse.
    let parsedSelectors = getParsedSelectors(configuration, block, rule, file);

    // Iterate over the all selectors for this rule – one for each comma separated selector.
    parsedSelectors.forEach((iSel) => {

      let keySel = iSel.key;
      let sel: CompoundSelector | undefined = iSel.selector;

      // Assert this selector is well formed according to CSS Blocks' selector rules.
      assertValidSelector(configuration, block, rule, iSel, file);

      // For each `CompoundSelector` in this rule, configure the `Block` object
      // depending on the BlockType.
      while (sel) {

        let isKey = (keySel === sel);
        let foundStyles = getStyleTargets(block, sel);

        // If this is an external Style, move on. These are validated
        // in `assert-foreign-global-attribute`.
        let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
        if (blockName) {
          sel = sel.next && sel.next.selector;
          continue;
        }

        // If this is the key selector, save this ruleset on the created style.
        if (isKey) {
          if (foundStyles.blockAttrs.length) {
            foundStyles.blockAttrs.map(s => addStyleRules(s, rule, styleRuleTuples));
          } else {
            foundStyles.blockClasses.map(s => addStyleRules(s, rule, styleRuleTuples));
          }
        }

        sel = sel.next && sel.next.selector;
      }
    });
  });

  // To allow self-referential block lookup when constructing ruleset concerns,
  // we need to run `addRuleset()` only *after* all Styles have been created.
  for (let [style, rule] of styleRuleTuples) {
    style.rulesets.addRuleset(configuration, file, rule);
  }

  return block;
}

function addStyleRules(style: AttrValue | BlockClass, rule: postcss.Rule, tuple: Set<[Style, postcss.Rule]>): void {
  rule.walkDecls(BLOCK_ALIAS, decl => {
    // TODO: check for errors
    // 1. check that the only separators are spaces
    // 2. check that there are no block aliases to complex selectors
    style.setStyleAliases(new Set(decl.value.split(/\s+/).map(stripQuotes)));
    decl.remove();
  });
  tuple.add([style, rule]);
}

/**
 * Assert that a provided selector follows all the combinator rules required
 * of block declarations.
 * @param block The block in this selector belongs to.
 * @param rule The PostCSS Rule.
 * @param selector The `ParsedSelector` to verify.
 */
function assertValidSelector(configuration: Configuration, block: Block, rule: postcss.Rule, selector: ParsedSelector, file: string) {

  // Verify our key selector targets a block object, but not one from an another block.
  let keyObject = assertBlockObject(configuration, block, selector.key, rule, file);
  if (keyObject.blockName) {
    throw new errors.InvalidBlockSyntax(
      `Cannot style values from other blocks: ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, keyObject.node));
  }

  // Fetch and validate our first `CompoundSelector`
  let currentCompoundSel: CompoundSelector = selector.selector;
  let currentObject = assertBlockObject(configuration, block, currentCompoundSel, rule, file);

  // Init caches to cumulatively track what we've discovered in the selector
  // as we iterate over each `CompoundSelector` inside it.
  let foundRootLevel = isRootLevelObject(currentObject);
  let foundClassLevel = isClassLevelObject(currentObject);
  let foundObjects: NodeAndType[] = [currentObject];
  let foundCombinators: string[] = [];

  // For each `CompoundSelector` in this rule:
  while (currentCompoundSel.next) {

    // Fetch and validate the next `CompoundSelector`
    let combinator = currentCompoundSel.next.combinator.value;
    foundCombinators.push(combinator);
    let nextCompoundSel = currentCompoundSel.next.selector;
    let nextObject = assertBlockObject(configuration, block, nextCompoundSel, rule, file);
    let nextLevelIsRoot = isRootLevelObject(nextObject);
    let nextLevelIsClass = isClassLevelObject(nextObject);

    // Don't allow weird combinators like the column combinator (`||`)
    // or the attribute target selector (e.g. `/for/`)
    if (!LEGAL_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `Illegal Combinator '${combinator}': ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      );
    }

    // Class level objects cannot be ancestors of root level objects
    if (isClassLevelObject(currentObject) && nextLevelIsRoot && SIBLING_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `A class is never a sibling of a ${blockTypeName(nextObject.blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, selector.selector.nodes[0]),
      );
    }

    // Once you go to the class level there's no combinator that gets you back to the root level
    if (foundClassLevel && nextLevelIsRoot) {
      throw new errors.InvalidBlockSyntax(
        `Illegal scoping of a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      );
    }

    // You can't reference a new root level object once you introduce descend the hierarchy
    if (foundRootLevel && nextLevelIsRoot && foundCombinators.some(c => HIERARCHICAL_COMBINATORS.has(c))) {
      // unless it's only referencing the same object.
      if (!foundObjects.every(f => f.node.toString() === nextObject.node.toString())) {
        throw new errors.InvalidBlockSyntax(
          `Illegal scoping of a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
          range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
        );
      }
    }

    // class-level and root-level objects cannot be siblings.
    if (isRootLevelObject(currentObject) && nextLevelIsClass && SIBLING_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `A ${blockTypeName(nextObject.blockType)} cannot be a sibling with a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      );
    }

    // Class-level objects cannot be combined with each other. only with themselves.
    if (isClassLevelObject(nextObject)) {
      let conflictObj = foundObjects.find(obj => isClassLevelObject(obj) && obj.node.toString() !== nextObject.node.toString());
      if (conflictObj) {
        // slightly better error verbiage for objects of the same type.
        if (conflictObj.blockType === nextObject.blockType) {
          throw new errors.InvalidBlockSyntax(
            `Distinct ${blockTypeName(conflictObj.blockType, { plural: true })} cannot be combined: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, nextObject.node),
          );
        } else {
          throw new errors.InvalidBlockSyntax(
            `Cannot combine a ${blockTypeName(conflictObj.blockType)} with a ${blockTypeName(nextObject.blockType)}}: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, nextObject.node),
          );
        }
      }
    }

    // Update caches and move on to the next `CompoundSelector`
    foundObjects.push(nextObject);
    foundRootLevel = foundRootLevel || nextLevelIsRoot;
    foundClassLevel = foundClassLevel || nextLevelIsClass;
    currentObject = nextObject;
    currentCompoundSel = nextCompoundSel;
  }
}

/**
 * Parses a CompoundSelector and returns the discovered Block Object. Validates
 * the given selector is well-formed in the process.
 * @param block The block that contains this selector we're validating.
 * @param sel The `CompoundSelector` in question.
 * @param rule The full `postcss.Rule` for nice error reporting.
 * @return Returns the block's name, type and node.
 */
function assertBlockObject(configuration: Configuration, block: Block, sel: CompoundSelector, rule: postcss.Rule, file: string): NodeAndType {

  // If selecting a block or tag, check that the referenced block has been imported.
  // Otherwise, referencing a tag name is not allowed in blocks, throw an error.
  let blockName = sel.nodes.find(selectorParser.isTag);
  if (blockName) {
    let refBlock = block.getReferencedBlock(blockName.value);
    if (!refBlock) {
      throw new errors.InvalidBlockSyntax(
        `Tag name selectors are not allowed: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, blockName),
      );
    }
  }

  // Targeting attributes that are not state selectors is not allowed in blocks, throw.
  let nonStateAttribute = sel.nodes.find(n => selectorParser.isAttribute(n) && !isAttributeNode(n));
  if (nonStateAttribute) {
    throw new errors.InvalidBlockSyntax(
      `Cannot select attributes other than states: ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, nonStateAttribute),
    );
  }

  // Disallow pseudoclasses that take selectors as arguments.
  sel.nodes.forEach(n => {
    if (selectorParser.isPseudoClass(n)) {
      let pseudo = n;
      if (pseudo.value === ":not" || pseudo.value === ":matches") {
        throw new errors.InvalidBlockSyntax(
          `The ${pseudo.value}() pseudoclass cannot be used: ${rule.selector}`,
          range(configuration, block.stylesheet, file, rule, pseudo),
        );
      }
    }
  });

  // Test each node in selector
  let result = sel.nodes.reduce<NodeAndType | null>(
    (found, n) => {

      // If this is an external Block reference, indicate we have encountered it.
      // If this is not the first BlockType encountered, throw the appropriate error.
      if (n.type === selectorParser.TAG) {
        if (found === null) {
          found = {
            blockType: BlockType.block,
            node: n,
          };
        } else {
          throw new errors.InvalidBlockSyntax(
            `External Block ${n} must be the first selector in "${rule.selector}"`,
            range(configuration, block.stylesheet, file, rule, sel.nodes[0]),
          );
        }
      }

      // If selecting the root element, indicate we have encountered it. If this
      // is not the first BlockType encountered, throw the appropriate error
      if (isRootNode(n)) {
        if (found === null) {
          found = {
            blockType: BlockType.root,
            node: n,
          };
        } else {
          if (found.blockType === BlockType.class || found.blockType === BlockType.classAttribute) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, sel.nodes[0]),
            );
          }
        }
      }

      // If selecting a state attribute, assert it is valid, save the found state,
      // and throw the appropriate error if conflicting selectors are found.
      else if (isAttributeNode(n)) {
        // Assert this state node uses a valid operator if specifying a value.
        if (n.value && n.operator !== "=") {
          throw new errors.InvalidBlockSyntax(
            `A state with a value must use the = operator (found ${n.operator} instead).`,
            range(configuration, block.stylesheet, file, rule, n),
          );
        }
        if (!found) {
          throw new errors.InvalidBlockSyntax(
            `States without an explicit :scope or class selector are not supported: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, n),
          );
        } else if (found.blockType === BlockType.class || found.blockType === BlockType.classAttribute) {
          found = { node: n, blockType: BlockType.classAttribute };
        } else if (found.blockType === BlockType.block || found.blockType === BlockType.root || found.blockType === BlockType.attribute) {
          found = { node: n, blockType: BlockType.attribute };
        }
      }

      // If selecting a class, save the found class, and throw the appropriate
      // error if conflicting selectors are found.
      else if (isClassNode(n)) {
        if (!found) {
          found = {
            node: n,
            blockType: BlockType.class,
          };
        } else {
          if (found.blockType === BlockType.root) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
          } else if (found.blockType === BlockType.class) {
            if (n.toString() !== found.node.toString()) {
              throw new errors.InvalidBlockSyntax(
                `Two distinct classes cannot be selected on the same element: ${rule.selector}`,
                range(configuration, block.stylesheet, file, rule, n));
            }
          } else if (found.blockType === BlockType.classAttribute || found.blockType === BlockType.attribute) {
            throw new errors.InvalidBlockSyntax(
              `The class must precede the state: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
          }
        }
      }
      return found;
  },
    null,
);

  // If no rules found in selector, we have a problem. Throw.
  if (!result) {
    throw new errors.InvalidBlockSyntax(
      `Missing block object in selector component '${sel.nodes.join("")}': ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
  }

  if (isExternalBlock(result)) {
    let external = block.getReferencedBlock(result.node.value!);
    if (!external) { throw new errors.InvalidBlockSyntax(``, range(configuration, block.stylesheet, file, rule, sel.nodes[0])); }
    let globalStates = external.rootClass.allAttributeValues().filter((a) => a.isGlobal);
    if (!globalStates.length) {
      throw new errors.InvalidBlockSyntax(
        `External Block '${result.node.value}' has no global states.`,
        range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
    }
    throw new errors.InvalidBlockSyntax(
      `Missing global state selector on external Block '${result.node.value}'. Did you mean one of: ${globalStates.map((s) => s.asSource()).join(" ")}`,
      range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
  }

  // Otherwise, return the block, type and associated node.
  else {
    return {
      blockName: blockName && blockName.value,
      ...result,
    };
  }
}
