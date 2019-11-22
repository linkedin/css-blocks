import { CompoundSelector, ParsedSelector, postcss, postcssSelectorParser as selectorParser } from "opticss";

import { BLOCK_ALIAS, CLASS_NAME_IDENT } from "../../BlockSyntax";
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

      // Assert this selector is well formed according to CSS Blocks' selector
      // rules.
      assertValidSelector(configuration, block, rule, iSel, file);

      // For each `CompoundSelector` in this rule, configure the `Block` object
      // depending on the BlockType.
      while (sel) {

        let isKey = (keySel === sel);
        let foundStyles = getStyleTargets(block, sel);

        // If this is an external Style, move on. These are validated
        // in `assert-foreign-global-attribute`.
        let blockName = sel.nodes.find(n => isAttributeNode(n) && n.namespace );
        if (blockName) {
          sel = sel.next && sel.next.selector;
          continue;
        }

        // If this is the key selector, save this ruleset on the created style.
        if (isKey) {
          if (foundStyles.blockAttrs.length) {
            foundStyles.blockAttrs.map(s => addStyleRules(configuration, block, rule, file, s, styleRuleTuples));
          } else {
            foundStyles.blockClasses.map(s => addStyleRules(configuration, block, rule, file, s, styleRuleTuples));
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

function addStyleRules(configuration: Configuration, block: Block, rule: postcss.Rule, file: string, style: AttrValue | BlockClass, tuple: Set<[Style, postcss.Rule]>): void {
  rule.walkDecls(BLOCK_ALIAS, decl => {
    let aliases: Set<string> = new Set();
    decl.value.split(/\s+/).map(alias => {
      let cleanedAlias = stripQuotes(alias);
      if (!CLASS_NAME_IDENT.test(cleanedAlias)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block-alias. "${alias}" is not a legal CSS identifier.`,
          sourceRange(configuration, block.stylesheet, file, rule),
        );
      }
      aliases.add(cleanedAlias);
    });
    style.setStyleAliases(aliases);
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

  // Verify our key selector targets a block object, but not one from an another
  // block.
  let keyObject = assertBlockObject(configuration, block, selector.key, rule, file);
  if (keyObject && keyObject.blockName) {
    block.addError(new errors.InvalidBlockSyntax(
      `Cannot style values from other blocks: ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, keyObject.node)));
  }

  // Fetch and validate our first `CompoundSelector`
  let currentCompoundSel: CompoundSelector = selector.selector;
  // if the selector is the key selecter, then we can use the keyObject as
  // itself to avoid multiple calls to assertBlockObject
  let currentObject = selector.key === currentCompoundSel ? keyObject : assertBlockObject(configuration, block, currentCompoundSel, rule, file);

  // Init caches to cumulatively track what we've discovered in the selector
  // as we iterate over each `CompoundSelector` inside it.
  let foundRootLevel = currentObject ? isRootLevelObject(currentObject) : false;
  let foundClassLevel = currentObject ? isClassLevelObject(currentObject) : false;
  let foundObjects: NodeAndType[] = currentObject ? [currentObject] : [];
  let foundCombinators: string[] = [];

  // For each `CompoundSelector` in this rule:
  while (currentCompoundSel.next) {

    // Fetch and validate the next `CompoundSelector`
    let combinator = currentCompoundSel.next.combinator.value;
    foundCombinators.push(combinator);
    let nextCompoundSel = currentCompoundSel.next.selector;
    // similarly, if the selector is the key selecter, then we can use the keyObject as
    // itself to avoid multiple calls to assertBlockObject
    let nextObject = selector.key === nextCompoundSel ? keyObject : assertBlockObject(configuration, block, nextCompoundSel, rule, file);
    let nextLevelIsRoot = nextObject ? isRootLevelObject(nextObject) : false;
    let nextLevelIsClass = nextObject ? isClassLevelObject(nextObject) : false;

    // Don't allow weird combinators like the column combinator (`||`)
    // or the attribute target selector (e.g. `/for/`)
    if (!LEGAL_COMBINATORS.has(combinator)) {
      block.addError(new errors.InvalidBlockSyntax(
        `Illegal Combinator '${combinator}': ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      ));
    }

    // Class level objects cannot be ancestors of root level objects
    if (currentObject && isClassLevelObject(currentObject) && nextLevelIsRoot && SIBLING_COMBINATORS.has(combinator)) {
      block.addError(new errors.InvalidBlockSyntax(
        `A class is never a sibling of a ${blockTypeName((nextObject as NodeAndType).blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, selector.selector.nodes[0]),
      ));
    }

    // Once you go to the class level there's no combinator that gets you back to the root level
    if (foundClassLevel && nextLevelIsRoot) {
      block.addError(new errors.InvalidBlockSyntax(
        `Illegal scoping of a ${blockTypeName((currentObject as NodeAndType).blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      ));
    }

    // You can't reference a new root level object once you introduce descend the hierarchy
    if (foundRootLevel && nextLevelIsRoot && foundCombinators.some(c => HIERARCHICAL_COMBINATORS.has(c))) {
      // unless it's only referencing the same object.
      if (!foundObjects.every(f => f.node.toString() === (nextObject as NodeAndType).node.toString())) {
        block.addError(new errors.InvalidBlockSyntax(
          `Illegal scoping of a ${blockTypeName((currentObject as NodeAndType).blockType)}: ${rule.selector}`,
          range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
        ));
      }
    }

    // class-level and root-level objects cannot be siblings.
    if (currentObject && isRootLevelObject(currentObject) && nextLevelIsClass && SIBLING_COMBINATORS.has(combinator)) {
      block.addError(new errors.InvalidBlockSyntax(
        `A ${blockTypeName((nextObject as NodeAndType).blockType)} cannot be a sibling with a ${blockTypeName(currentObject.blockType)}: ${rule.selector}`,
        range(configuration, block.stylesheet, file, rule, currentCompoundSel.next.combinator),
      ));
    }

    // Class-level objects cannot be combined with each other. only with themselves.
    if (nextObject && isClassLevelObject(nextObject)) {
      let conflictObj = foundObjects.find(obj => isClassLevelObject(obj) && obj.node.toString() !== (nextObject as NodeAndType).node.toString());
      if (conflictObj) {
        // slightly better error verbiage for objects of the same type.
        if (conflictObj.blockType === nextObject.blockType) {
          block.addError(new errors.InvalidBlockSyntax(
            `Distinct ${blockTypeName(conflictObj.blockType, { plural: true })} cannot be combined: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, nextObject.node),
          ));
        } else {
          block.addError(new errors.InvalidBlockSyntax(
            `Cannot combine a ${blockTypeName(conflictObj.blockType)} with a ${blockTypeName(nextObject.blockType)}}: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, nextObject.node),
          ));
        }
      }
    }

    // Update caches and move on to the next `CompoundSelector`
    if (nextObject) {
      foundObjects.push(nextObject);
    }

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
function assertBlockObject(configuration: Configuration, block: Block, sel: CompoundSelector, rule: postcss.Rule, file: string): NodeAndType | null {
  let tagNode = sel.nodes.find(selectorParser.isTag);
  if (tagNode) {
    block.addError(new errors.InvalidBlockSyntax(
      `Tag name selectors are not allowed: ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, tagNode),
    ));
  }

  // Targeting attributes that are not state selectors is not allowed in blocks, throw.
  let nonStateAttribute = sel.nodes.find(n => selectorParser.isAttribute(n) && !isAttributeNode(n));
  if (nonStateAttribute) {
    block.addError(new errors.InvalidBlockSyntax(
      `Cannot select attributes in the \`${selectorParser.isAttribute(nonStateAttribute) && nonStateAttribute.namespaceString}\` namespace: ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, nonStateAttribute),
    ));
  }

  // Disallow pseudoclasses that take selectors as arguments.
  sel.nodes.forEach(n => {
    if (selectorParser.isPseudoClass(n)) {
      let pseudo = n;
      if (pseudo.value === ":not" || pseudo.value === ":matches") {
        block.addError(new errors.InvalidBlockSyntax(
          `The ${pseudo.value}() pseudoclass cannot be used: ${rule.selector}`,
          range(configuration, block.stylesheet, file, rule, pseudo),
        ));
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
          block.addError(new errors.InvalidBlockSyntax(
            `A state with a value must use the = operator (found ${n.operator} instead).`,
            range(configuration, block.stylesheet, file, rule, n),
          ));
        }
        if (n.attribute === "scope") {
          throw new errors.InvalidBlockSyntax(
            `A state cannot be named 'scope'.`,
            range(configuration, block.stylesheet, file, rule, n),
          );
        }
        if (!found) {
          block.addError(new errors.InvalidBlockSyntax(
            `States without an explicit :scope or class selector are not supported: ${rule.selector}`,
            range(configuration, block.stylesheet, file, rule, n),
          ));
        } else if (found.blockType === BlockType.class || found.blockType === BlockType.classAttribute) {
          found = { node: n, blockType: BlockType.classAttribute };
        } else if (found.blockType === BlockType.root || found.blockType === BlockType.attribute) {
          if (n.namespace === true) {
            throw new errors.InvalidBlockSyntax(
              `The "any namespace" selector is not supported: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, n),
            );
          }
          // XXX this is where we drop the ref to the other attribute nodes,
          // XXX potentially causing the interface to not be fully discovered
          found = { node: n, blockType: BlockType.attribute, blockName: n.namespace };
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
            block.addError(new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, sel.nodes[0])));
          } else if (found.blockType === BlockType.class) {
            if (n.toString() !== found.node.toString()) {
              block.addError(new errors.InvalidBlockSyntax(
                `Two distinct classes cannot be selected on the same element: ${rule.selector}`,
                range(configuration, block.stylesheet, file, rule, n)));
            }
          } else if (found.blockType === BlockType.classAttribute || found.blockType === BlockType.attribute) {
            block.addError(new errors.InvalidBlockSyntax(
              `The class must precede the state: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, sel.nodes[0])));
          }
        }
      }
      return found;
    },
    null,
  );

  // If no rules found in selector, we have a problem. Throw.
  if (!result) {
    block.addError(new errors.InvalidBlockSyntax(
      `Missing block object in selector component '${sel.nodes.join("")}': ${rule.selector}`,
      range(configuration, block.stylesheet, file, rule, sel.nodes[0])));
    return null;
  }

  else if (isExternalBlock(result)) {
    let blockName: string | undefined;
    if (result.blockType === BlockType.attribute) {
      blockName = result.blockName!;
    } else {
      blockName = result.node.value;
    }
    let external = block.getReferencedBlock(blockName);
    if (!external) {
      throw new errors.InvalidBlockSyntax(`A block named "${blockName}" does not exist in this context.`,
                                          range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
    }
    let globalStates = external.rootClass.allAttributeValues().filter((a) => a.isGlobal);
    if (!globalStates.length) {
      throw new errors.InvalidBlockSyntax(
        `External Block '${blockName}' has no global states.`,
        range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
    }
    if (result.blockType !== BlockType.attribute) {
      throw new errors.InvalidBlockSyntax(
        `Missing global state selector on external Block '${blockName}'. Did you mean one of: ${globalStates.map((s) => s.asSource()).join(" ")}`,
        range(configuration, block.stylesheet, file, rule, sel.nodes[0]));
    }
    return result;
  }

  // Otherwise, return the block, type and associated node.
  else {
    return result;
  }
}
