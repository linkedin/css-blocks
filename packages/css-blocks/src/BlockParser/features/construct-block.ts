import { assertNever } from "@opticss/util";
import { CompoundSelector, ParsedSelector } from "opticss";
import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");

import { Block, Style } from "../../Block";
import { selectorSourceLocation as loc, sourceLocation } from "../../SourceLocation";
import * as errors from "../../errors";
import {
  BlockNodeAndType,
  BlockType,
  blockTypeName,
  getBlockNode,
  isAttributeNode,
  isClassLevelObject,
  isClassNode,
  isRootLevelObject,
  isRootNode,
  NodeAndType,
  toAttrToken,
} from "../block-intermediates";

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
function getParsedSelectors(block: Block, rule: postcss.Rule, file: string): ParsedSelector[] {
  let res;
  try { res = block.getParsedSelectors(rule); }
  catch (e) { throw new errors.InvalidBlockSyntax(e.message, sourceLocation(file, rule)); }
  return res;
}

export async function constructBlock(root: postcss.Root, block: Block, file: string): Promise<Block> {

  let styleRuleTuples: Set<[Style, postcss.Rule]> = new Set();

  // For each rule in this Block
  root.walkRules((rule) => {

    // Abort if is not a block rule.
    if (!shouldBeParsedAsBlockSelector(rule)) { return; }

    // Fetch the parsed selectors list. Throw a helpful error if we can't parse.
    let parsedSelectors = getParsedSelectors(block, rule, file);

    // Iterate over the all selectors for this rule – one for each comma separated selector.
    parsedSelectors.forEach((iSel) => {

      let keySel = iSel.key;
      let currentCompoundSel: CompoundSelector | undefined = iSel.selector;

      // Assert this selector is well formed according to CSS Blocks' selector rules.
      assertValidSelector(block, rule, iSel, file);

      // For each `CompoundSelector` in this rule, configure the `Block` object
      // depending on the BlockType.
      while (currentCompoundSel) {
        let isKey = (keySel === currentCompoundSel);
        let obj = getBlockNode(currentCompoundSel);
        if (obj) {
          switch (obj.blockType) {

            // If type `block`, track all property concerns on the block object
            // itself, excluding any inheritance properties. Make sure to
            // process any inheritance properties present in this ruleset.
            case BlockType.root:
              if (!isKey) { break; }
              styleRuleTuples.add([block.rootClass, rule]);
              break;

            // If a local attribute selector, ensure the attribute is registered with
            // the parent block and track add all property concerns from this
            // ruleset. If a foreign attribute, do nothing (validation happened earlier).
            case BlockType.attribute:
              if (obj.blockName) { break; }
              let attr = block.rootClass.ensureAttributeValue(toAttrToken(obj.node));
              if (!isKey) { break; }
              styleRuleTuples.add([attr, rule]);
              break;

            // If a class selector, ensure this class is registered with the
            // parent block and track all property concerns from this ruleset.
            case BlockType.class:
              let blockClass = block.ensureClass(obj.node.value);
              if (!isKey) { break; }
              styleRuleTuples.add([blockClass, rule]);
              break;

            // If a classAttribute selector, ensure the class is registered with
            // the parent block, and the attribute is registered with this class.
            // Track all property concerns from this ruleset.
            case BlockType.classAttribute:
              let classNode = obj.node.prev();
              let classObj = block.ensureClass(classNode.value!);
              let classAttr = classObj.ensureAttributeValue(toAttrToken(obj.node));
              if (!isKey) { break; }
              styleRuleTuples.add([classAttr, rule]);
              break;
            default:
              assertNever(obj);
          }
        }

        // Move on to the next compound selector.
        currentCompoundSel = currentCompoundSel.next && currentCompoundSel.next.selector;
      }
    });
  });

  // To allow self-referential block lookup when constructing ruleset concerns,
  // we need to run `addRuleset()` only *after* all Style have been created.
  for (let [style, rule] of styleRuleTuples) {
    style.rulesets.addRuleset(file, rule);
  }

  return block;
}

/**
 * Assert that a provided selector follows all the combinator rules required
 * of block declarations.
 * @param block The block in this selector belongs to.
 * @param rule The PostCSS Rule.
 * @param selector The `ParsedSelector` to verify.
 */
function assertValidSelector(block: Block, rule: postcss.Rule, selector: ParsedSelector, file: string) {

  // Verify our key selector targets a block object, but not one from an another block.
  let keyObject = assertBlockObject(block, selector.key, rule, file);
  if (keyObject.blockName) {
    throw new errors.InvalidBlockSyntax(
      `Cannot style values from other blocks: ${rule.selector}`,
      loc(file, rule, keyObject.node));
  }

  // Fetch and validate our first `CompoundSelector`
  let currentCompoundSel: CompoundSelector = selector.selector;
  let currentObject = assertBlockObject(block, currentCompoundSel, rule, file);

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
    let nextObject = assertBlockObject(block, nextCompoundSel, rule, file);
    let nextLevelIsRoot = isRootLevelObject(nextObject);
    let nextLevelIsClass = isClassLevelObject(nextObject);

    // Don't allow weird combinators like the column combinator (`||`)
    // or the attribute target selector (e.g. `/for/`)
    if (!LEGAL_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `Illegal Combinator '${combinator}': ${rule.selector}`,
        loc(file, rule, currentCompoundSel.next.combinator),
      );
    }

    // Class level objects cannot be ancestors of root level objects
    if (isClassLevelObject(currentObject) && nextLevelIsRoot && SIBLING_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `A class is never a sibling of a ${blockTypeName(nextObject.blockType)}: ${rule.selector}`,
        loc(file, rule, selector.selector.nodes[0]),
      );
    }

    // Once you go to the class level there's no combinator that gets you back to the root level
    if (foundClassLevel && nextLevelIsRoot) {
      throw new errors.InvalidBlockSyntax(
        `Illegal scoping of a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
        loc(file, rule, currentCompoundSel.next.combinator),
      );
    }

    // You can't reference a new root level object once you introduce descend the hierarchy
    if (foundRootLevel && nextLevelIsRoot && foundCombinators.some(c => HIERARCHICAL_COMBINATORS.has(c))) {
      // unless it's only referencing the same object.
      if (!foundObjects.every(f => f.node.toString() === nextObject.node.toString())) {
        throw new errors.InvalidBlockSyntax(
          `Illegal scoping of a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
          loc(file, rule, currentCompoundSel.next.combinator),
        );
      }
    }

    // class-level and root-level objects cannot be siblings.
    if (isRootLevelObject(currentObject) && nextLevelIsClass && SIBLING_COMBINATORS.has(combinator)) {
      throw new errors.InvalidBlockSyntax(
        `A ${blockTypeName(nextObject.blockType)} cannot be a sibling with a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
        loc(file, rule, currentCompoundSel.next.combinator),
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
            loc(file, rule, nextObject.node),
          );
        } else {
          throw new errors.InvalidBlockSyntax(
            `Cannot combine a ${blockTypeName(conflictObj.blockType)} with a ${blockTypeName(nextObject.blockType)}}: ${rule.selector}`,
            loc(file, rule, nextObject.node),
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
function assertBlockObject(block: Block, sel: CompoundSelector, rule: postcss.Rule, file: string): BlockNodeAndType {

  // If selecting a block or tag, check that the referenced block has been imported.
  // Otherwise, referencing a tag name is not allowed in blocks, throw an error.
  let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
  if (blockName) {
    let refBlock = block.getReferencedBlock(blockName.value!);
    if (!refBlock) {
      throw new errors.InvalidBlockSyntax(
        `Tag name selectors are not allowed: ${rule.selector}`,
        loc(file, rule, blockName),
      );
    }
  }

  // Targeting attributes that are not state selectors is not allowed in blocks, throw.
  let nonStateAttribute = sel.nodes.find(n => n.type === selectorParser.ATTRIBUTE && !isAttributeNode(n));
  if (nonStateAttribute) {
    throw new errors.InvalidBlockSyntax(
      `Cannot select attributes other than states: ${rule.selector}`,
      loc(file, rule, nonStateAttribute),
    );
  }

  // Disallow pseudoclasses that take selectors as arguments.
  sel.nodes.forEach(n => {
    if (n.type === selectorParser.PSEUDO) {
      let pseudo = n;
      if (pseudo.value === ":not" || pseudo.value === ":matches") {
        throw new errors.InvalidBlockSyntax(
          `The ${pseudo.value}() pseudoclass cannot be used: ${rule.selector}`,
          loc(file, rule, pseudo),
        );
      }
    }
  });

  // Test each node in selector
  let result = sel.nodes.reduce<NodeAndType | null>(
    (found, n) => {
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
              loc(file, rule, sel.nodes[0]),
            );
          } else if (found.blockType === BlockType.attribute) {
            throw new errors.InvalidBlockSyntax(
              `It's redundant to specify a state with the an explicit .root: ${rule.selector}`,
              loc(file, rule, n),
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
            loc(file, rule, n),
          );
        }
        if (!found) {
          found = { node: n, blockType: BlockType.attribute };
        } else if (found.blockType === BlockType.class) {
          found = { node: n, blockType: BlockType.classAttribute };
        } else if (found.blockType === BlockType.root) {
          throw new errors.InvalidBlockSyntax(
            `It's redundant to specify a state with an explicit .root: ${rule.selector}`,
            loc(file, rule, found.node),
          );
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
              loc(file, rule, sel.nodes[0]));
          } else if (found.blockType === BlockType.class) {
            if (n.toString() !== found.node.toString()) {
              throw new errors.InvalidBlockSyntax(
                `Two distinct classes cannot be selected on the same element: ${rule.selector}`,
                loc(file, rule, n));
            }
          } else if (found.blockType === BlockType.classAttribute || found.blockType === BlockType.attribute) {
            throw new errors.InvalidBlockSyntax(
              `The class must precede the state: ${rule.selector}`,
              loc(file, rule, sel.nodes[0]));
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
      loc(file, rule, sel.nodes[0]));
  }

  // Otherwise, return the block, type and associated node.
  else {
    return {
      blockName: blockName && blockName.value,
      ...result,
    };
  }
}
