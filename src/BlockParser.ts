import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");
import { PluginOptions, OptionsReader } from "./options";
import { Block, StateInfo } from "./Block";
import * as errors from "./errors";
import { ImportedFile } from "./importing";
export { PluginOptions } from "./options";
import { sourceLocation, selectorSourceLocation } from "./SourceLocation";
import parseSelector, { ParsedSelector, CompoundSelector } from "./parseSelector";
import regexpu = require("regexpu-core");

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const LEGAL_COMBINATORS = new Set(["+", "~", " ", ">"]);

export const CLASS_NAME_IDENT = new RegExp(regexpu("((?:\\\\.|[A-Za-z_\\-\\u{00a0}-\\u{10ffff}])(?:\\\\.|[A-Za-z_\\-0-9\\u{00a0}-\\u{10ffff}])*)", "u"));

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
// const selectorParserFn = require("postcss-selector-parser");

// TODO: Re-name `block` to `root`, its a little confusing.
export enum BlockType {
  root = 1,
  state,
  class,
  classState
}

export interface NodeAndType {
  blockType: BlockType;
  node: selectorParser.Node;
}

export interface BlockNodeAndType extends NodeAndType {
  blockName?: string;
}

/**
 * Check if given selector node is targeting the root block node
 */
export function isRoot(node: selectorParser.Node) {
  return node.type === selectorParser.CLASS &&
         node.value === "root";
}

/**
 * Check if given selector node is a state selector
 * @param  node The selector to test.
 * @return True if state selector, false if not.
 */
export function isState(node: selectorParser.Node) {
  return node.type === selectorParser.ATTRIBUTE &&
         (<selectorParser.Attribute>node).namespace === "state";
}

/**
 * Check if given selector node is a class selector
 * @param  node The selector to test.
 * @return True if class selector, false if not.
 */
export function isClass(node: selectorParser.Node) {
  return node.type === selectorParser.CLASS;
}

/**
 * CSS Blocks state parser.
 * @param  attr The css attribute selector that represents this state.
 * @return A `StateInfo` object that represents the state.
 */
export function stateParser(attr: selectorParser.Attribute): StateInfo {
  let info: StateInfo = {
    name: attr.attribute
  };
  if (attr.value) {
    info.group = info.name;
    info.name = attr.value;
  }
  return info;
}

/**
 * Parser that, given a PostCSS AST will return a `Block` object. Main public
 * interface is `BlockParser.parse`.
 */
export default class BlockParser {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  /**
   * Main public interface of `BlockParser`. Given a PostCSS AST, returns a promise
   * for the new `Block` object.
   * @param root  PostCSS AST
   * @param sourceFile  Source file name
   * @param defaultName Name of block
   */
  public parse(root: postcss.Root, sourceFile: string, defaultName: string): Promise<Block> {

    // `!important` is not allowed in Blocks. If contains `!important` declaration, throw.
    root.walkDecls((decl) => {
      if (decl.important) {
        throw new errors.InvalidBlockSyntax(
          `!important is not allowed for \`${decl.prop}\` in \`${(<postcss.Rule>decl.parent).selector}\``,
          sourceLocation(sourceFile, decl));
      }
    });

    // Eagerly fetch custom `block-name` from the root block rule.
    root.walkRules(".root", (rule) => {
      rule.walkDecls("block-name", (decl) => {
        if (CLASS_NAME_IDENT.test(decl.value)) {
          return defaultName = decl.value;
        }
        throw new errors.InvalidBlockSyntax(`Illegal block name. '${decl.value}' is not a legal CSS identifier.`, sourceLocation(sourceFile, decl));
      });
    });

    // Create our new Block object and save reference to the raw AST
    let block = new Block(defaultName, sourceFile);
    block.root = root;

    // Once all block references included by this block are resolved
    return this.resolveReferences(block).then((block) => {

      // Handle any global states defined by this block.
      root.walkAtRules("block-global", (atRule) => {

        let selectors = parseSelector(atRule.params.trim());

        // The syntax for a `@block-global` at-rule is a simple selector for a state.
        // Parse selector allows a much broader syntax so we validate that the parsed
        // result is legal here, if it is, we create the state and mark it global.
        if (selectors.length === 1 && selectors[0].key === selectors[0].selector) {
          let nodes = selectors[0].key.nodes;
          if (nodes.length === 1 && nodes[0].type === selectorParser.ATTRIBUTE) {
            let info = stateParser(<selectorParser.Attribute>selectors[0].key.nodes[0]);
            let state = block.states._ensureState(info);
            state.isGlobal = true;
          } else {
            throw new errors.InvalidBlockSyntax(
              `Illegal global state declaration: ${atRule.toString()}`,
              sourceLocation(sourceFile, atRule));
          }
        }

        // TODO: Handle complex global selector

      });

      // For each rule in this Block
      root.walkRules((rule) => {

        // Fetch and iterate over the parsed selectors list for this rule – one
        // for each comma seperated selector.
        let parsedSelectors = block.getParsedSelectors(rule);
        parsedSelectors.forEach((iSel) => {

          let keySel = iSel.key;
          let currentCompoundSel: CompoundSelector | undefined = iSel.selector;

          // Assert this selector is well formed according to CSS Blocks' selector rules.
          this.assertValidSelector(block, rule, iSel);

          // For each `CompoundSelector` in this rule, configure the `Block` object
          // depending on the BlockType.
          while (currentCompoundSel) {
            let isKey = (keySel === currentCompoundSel);
            let obj = BlockParser.getBlockNode(currentCompoundSel);
            if (obj) {
              switch (obj.blockType) {

                // If type `block`, track all property concerns on the block object
                // itself, excluding any inheritance properties. Make sure to
                // process any inheritance properties present in this ruleset.
                case BlockType.root:

                  // If is bare root selector, execute on extend and implement calls.
                  if (obj.node.next() === undefined && obj.node.prev() === undefined) {
                    this.extendBlock(block, sourceFile, rule);
                    this.implementsBlock(block, sourceFile, rule);
                  }

                  if (isKey) {
                    block.propertyConcerns.addProperties(rule, block, (prop) => !/(extends|implements|block-name)/.test(prop));
                  }
                  break;

                // If a local state selector, ensure the state is registered with
                // the parent block and track add all property concerns from this
                // ruleset. If a foreign state, do nothing (validation happened earlier).
                case BlockType.state:
                  if (obj.blockName) {
                    let foreignBlock = block.getReferencedBlock(obj.blockName);
                    if (foreignBlock) {

                    }
                  } else {
                    let state = block.states._ensureState(stateParser(<selectorParser.Attribute>obj.node));
                    if (isKey) {
                      state.propertyConcerns.addProperties(rule, block);
                    }
                  }
                  break;

                // If a class selector, ensure this class is registered with the
                // parent block and track all property concerns from this ruleset.
                case BlockType.class:
                  let blockClass = block.ensureClass(obj.node.value);
                  if (isKey) {
                    blockClass.propertyConcerns.addProperties(rule, block);
                  }
                  break;

                // If a classState selector, ensure the class is registered with
                // the parent block, and the state is registered with this class.
                // Track all property concerns from this ruleset.
                case BlockType.classState:
                  let classNode = obj.node.prev();
                  let classObj = block.ensureClass(classNode.value);
                  let classState = classObj.states._ensureState(stateParser(<selectorParser.Attribute>obj.node));
                  if (isKey) {
                    classState.propertyConcerns.addProperties(rule, block);
                  }
                  break;
              }
            }

            // Move on to the next compound selector.
            currentCompoundSel = currentCompoundSel.next && currentCompoundSel.next.selector;
          }
        });
      });

      // Validate that all rules from external block this block impelemnets are...implemented
      block.checkImplementations();
      return block;
    });
  }

  /**
   * For each `implements` property found in the passed ruleset, track the foreign
   * block. If block is not found, throw.
   * @param block  Block object being processed
   * @param sourceFile  Source file name, used for error output.
   * @param rule Ruleset to crawl
   */
  private implementsBlock(block: Block, sourceFile: string, rule: postcss.Rule) {
    rule.walkDecls("implements", (decl) => {
      let refNames = decl.value.split(/,\s*/);
      refNames.forEach((refName) => {
        let refBlock = block.getReferencedBlock(refName);
        if (!refBlock) {
          throw new errors.InvalidBlockSyntax(`No block named ${refName} found`,
                                              sourceLocation(sourceFile, decl));
        }
        block.addImplementation(refBlock);
      });
    });
  }

  /**
   * For each `extends` property found in the passed ruleset, set the block's base
   * to the foreign block. If block is not found, throw.
   * @param block  Block object being processed.
   * @param sourceFile  Source file name, used for error output.
   * @param rule Ruleset to crawl.
   */
  private extendBlock(block: Block, sourceFile: string, rule: postcss.Rule) {
    rule.walkDecls("extends", (decl) => {
      if (block.base) {
        throw new errors.InvalidBlockSyntax(`A block can only be extended once.`, sourceLocation(sourceFile, decl));
      }
      let baseName = decl.value;
      let baseBlock = block.getReferencedBlock(baseName);
      if (!baseBlock) {
        throw new errors.InvalidBlockSyntax(`No block named ${baseName} found`, sourceLocation(sourceFile, decl));
      }
      block.setBase(baseName, baseBlock);
    });
  }

  /**
   * Resolve all block references for a given block.
   * @param block Block to resolve references for
   * @return Promise that resolves when all references have been loaded.
   */
  private resolveReferences(block: Block): Promise<Block> {

    let root: postcss.Root | undefined = block.root;
    let sourceFile: string = block.source;
    let namedBlockReferences: Promise<[string, Block]>[] = [];

    if (!root) {
      throw new errors.InvalidBlockSyntax(`Error finding PostCSS root for block ${block.name}`);
    }

    // For each `@block-reference` expression, read in the block file, parse and
    // push to block references Promise array.
    root.walkAtRules("block-reference", (atRule) => {
      let md = atRule.params.match(/^\s*((\w+)\s+from\s+)?\s*("|')([^\3]+)\3\s*$/);
      if (!md) {
        throw new errors.InvalidBlockSyntax(
          `Malformed block reference: \`@block-reference ${atRule.params}\``,
          sourceLocation(sourceFile, atRule));
      }
      let importPath = md[4];
      let localName = md[2];

      // Import file, then parse file, then save block reference.
      let result: Promise<ImportedFile> = this.opts.importer(sourceFile, importPath);
      let extractedResult: Promise<Block> = result.then((importedFile: ImportedFile) => {
        let otherRoot = this.postcss.parse(importedFile.contents, {from: importedFile.path});
        return this.parse(otherRoot, importedFile.path, importedFile.defaultName);
      });
      let namedResult: Promise<[string, Block]> = extractedResult.then((referencedBlock) => {
        return [localName, referencedBlock];
      });
      namedBlockReferences.push(namedResult);
    });

    // When all import promises have resolved, save the block references and resolve.
    return Promise.all(namedBlockReferences).then((results) => {
      results.forEach(([localName, otherBlock]) => {
        block.addBlockReference(localName || otherBlock.name, otherBlock);
      });
    }).then(() => {
      return block;
    });
  }

  /**
   * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
   * @param sourceFile File name of block in question.
   * @param root PostCSS Root for block.
   * @param block Block to resolve references for
   */
  public processDebugStatements(sourceFile: string, root: postcss.Root, block: Block) {
    root.walkAtRules("block-debug", (atRule) => {
      let md = atRule.params.match(/([^\s]+) to (comment|stderr|stdout)/);
      if (!md) {
        throw new errors.InvalidBlockSyntax(
          `Malformed block debug: \`@block-debug ${atRule.params}\``,
          sourceLocation(sourceFile, atRule));
      }
      let localName = md[1];
      let outputTo = md[2];
      let ref: Block | null = block.getReferencedBlock(localName);
      if (!ref) {
        throw new errors.InvalidBlockSyntax(
          `No block named ${localName} exists in this context.`,
          sourceLocation(sourceFile, atRule));
      }
      let debugStr = ref.debug(this.opts);
      if (outputTo === "comment") {
        atRule.replaceWith(this.postcss.comment({text: debugStr.join("\n   ")}));
      } else {
        if (outputTo === "stderr") {
          console.warn(debugStr.join("\n"));
        } else {
          console.log(debugStr.join("\n"));
        }
        atRule.remove();
      }
    });
  }

  /**
   * Assert that a provided state rule is valid.
   * @param sourceFile File name of block in question.
   * @param root The PostCSS Rule.
   * @param attr Attribute to verify.
   */
  private assertValidState(sourceFile: string, rule: postcss.Rule, attr: selectorParser.Attribute) {
    if (attr.value && attr.operator !== "=") {
      throw new errors.InvalidBlockSyntax(`A state with a value must use the = operator (found ${attr.operator} instead).`,
                                          selectorSourceLocation(sourceFile, rule, attr));
    }
  }

  /**
   * Similar to assertBlockObject except it doesn't check for well-formedness
   * and doesn't ensure that you get a block object when not a legal selector.
   * @param sel The `CompoundSelector` to search.
   * @return Returns the block's name, type and node.
   */
  static getBlockNode(sel: CompoundSelector): BlockNodeAndType | null {
    let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
    let n = sel.nodes.find(n => isRoot(n));
    if (n) {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.root,
        node: n
      };
    }
    n = sel.nodes.find(n => isState(n));
    if (n) {
      let prev = n.prev();
      if (prev && isClass(prev)) {
        return {
          blockName: blockName && blockName.value,
          blockType: BlockType.classState,
          node: n
        };
      } else {
        return {
          blockName: blockName && blockName.value,
          blockType: BlockType.state,
          node: n
        };
      }
    }
    n = sel.nodes.find(n => isClass(n));
    if (n) {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.class,
        node: n
      };
    } else {
      return null;
    }
  }

  /**
   * Parses a CompoundSelector and returns the discovered Block Object. Validates
   * well-formedness of the given selector in the process.
   * @param block The block that contains this selector we're validating.
   * @param sel The `CompoundSelector` in question.
   * @param rule The full `postcss.Rule` for nice error reporting.
   * @return Returns the block's name, type and node.
   */
  private assertBlockObject(block: Block, sel: CompoundSelector, rule: postcss.Rule): BlockNodeAndType {

    // If selecting a block or tag, check that the referenced block has been imported.
    // Otherwise, referencing a tag name is not allowd in blocks, throw an error.
    let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
    if (blockName) {
      let refBlock = block.getReferencedBlock(blockName.value);
      if (!refBlock) {
        throw new errors.InvalidBlockSyntax(
          `Tag name selectors are not allowed: ${rule.selector}`,
          selectorSourceLocation(block.source, rule, blockName));
      }
    }

    // Targeting attributes that are not state selectors is not allowd in blocks, throw.
    let nonStateAttribute = sel.nodes.find(n => n.type === selectorParser.ATTRIBUTE && !isState(n));
    if (nonStateAttribute) {
      if ((<selectorParser.Attribute>nonStateAttribute).attribute.match(/state:/)) {
        throw new errors.InvalidBlockSyntax(
          `State attribute selctors use a \`|\`, not a \`:\` which is illegal CSS syntax and won't work in other parsers: ${rule.selector}`,
          selectorSourceLocation(block.source, rule, nonStateAttribute));
      } else {
        throw new errors.InvalidBlockSyntax(
          `Cannot select attributes other than states: ${rule.selector}`,
          selectorSourceLocation(block.source, rule, nonStateAttribute));
      }
    }

    // Test each node in selector
    let result = sel.nodes.reduce<NodeAndType|null>((found, n) => {

      // If selecting the root element, indicate we have encountered it. If this
      // is not the first BlockType encountered, throw the appropriate error
      if (isRoot(n)) {
        if (found === null) {
          found = {
            blockType: BlockType.root,
            node: n
          };
        } else {
          if (found.blockType === BlockType.class || found.blockType === BlockType.classState) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, sel.nodes[0]));
          } else if (found.blockType === BlockType.state) {
            throw new errors.InvalidBlockSyntax(
              `It's redundant to specify a state with the an explicit .root: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, n));
          }
        }
      }

      // If selecting a state attribute, assert it is valid, save the found state,
      // and throw the appropriate error if conflicting selectors are found.
      else if (isState(n)) {
        this.assertValidState(block.source, rule, <selectorParser.Attribute>n);
        if (!found) {
          found = {
            node: n,
            blockType: BlockType.state
          };
        } else if (found.blockType === BlockType.class) {
          found = {
            node: n,
            blockType: BlockType.classState
          };
        } else if (found.blockType === BlockType.state || found.blockType === BlockType.classState) {
          if (n.toString() !== found.node.toString()) {
            throw new errors.InvalidBlockSyntax(
              `Two distinct states cannot be selected on the same element: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, n));
          }
        } else if (found.blockType === BlockType.root) {
            throw new errors.InvalidBlockSyntax(
              `It's redundant to specify a state with an explicit .root: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, found.node));
        }
      }

      // If selecting a class, save the found state, and throw the appropriate
      // error if conflicting selectors are found.
      else if (isClass(n)) {
        if (!found) {
          found = {
            node: n,
            blockType: BlockType.class
          };
        } else {
          if (found.blockType === BlockType.root) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, sel.nodes[0]));
          } else if (found.blockType === BlockType.class) {
            if (n.toString() !== found.node.toString()) {
              throw new errors.InvalidBlockSyntax(
                `Two distinct classes cannot be selected on the same element: ${rule.selector}`,
                selectorSourceLocation(block.source, rule, n));
            }
          } else if (found.blockType === BlockType.classState || found.blockType === BlockType.state) {
            throw new errors.InvalidBlockSyntax(
              `The class must precede the state: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, sel.nodes[0]));
          }
        }
      }
      return found;
    }, null);

    // If no rules found in selector, we have a problem. Throw.
    if (!result) {
      throw new errors.InvalidBlockSyntax(
        `Missing block object in selector component '${sel.nodes.join('')}': ${rule.selector}`,
        selectorSourceLocation(block.source, rule, sel.nodes[0]));
    }

    // Otherwise, return the block, type and associated node.
    else {
      return {
        blockName: blockName && blockName.value,
        blockType: result.blockType,
        node: result.node
      };
    }
  }

  /**
   * Internal method used to generate human readable error messages when parsing.
   * @param t The block type we're generating a human readable name for.
   * @param options Options for output, currently just to specify plurality.
   * @return A human readable descriptor for the given `BlockType`.
   */
  private objectTypeName(t: BlockType, options?: {plural: boolean}): string {
    let isPlural = options && options.plural;
    switch(t) {
      case BlockType.root: return isPlural ? "block roots" : "block root";
      case BlockType.state: return isPlural ? "root-level states" : "root-level state";
      case BlockType.class: return isPlural ? "classes" : "class";
      case BlockType.classState: return isPlural ? "class states" : "class state";
      default: return "¯\_(ツ)_/¯";
    }
  }

  /**
   * Test if the provided node representation is a root level object, aka: operating
   * on the root element.
   * @param object The CompoundSelector's descriptor object.
   */
  private isRootLevelObject(object: NodeAndType): boolean {
    return object.blockType === BlockType.root || object.blockType === BlockType.state;
  }

  /**
   * Test if the provided node representation is a class level object, aka: operating
   * on an element contained by the root, not the root itself.
   * @param object The CompoundSelector's descriptor object.
   */
  private isClassLevelObject(object: NodeAndType): boolean {
    return object.blockType === BlockType.class || object.blockType === BlockType.classState;
  }

  /**
   * Verify that the external block referenced by `rule` selects on a state that
   * exists in the external block and is exposed as a global.
   * @param block The current block making the external reference.
   * @param rule The rule referencing the external block.
   * @param obj The parsed node making the external reference.
   */
  private assertForeignGlobalState(block: Block, rule: postcss.Rule, obj: BlockNodeAndType) {

    // If node isn't selecting a block, throw
    if (!obj.blockName) {
      throw new errors.InvalidBlockSyntax(
        `Foreign reference expected but not found: ${rule.selector}`,
        selectorSourceLocation(block.source, rule, obj.node));
    }

    // If selecting something other than a state on external block, throw.
    if (obj.blockType !== BlockType.state) {
      throw new errors.InvalidBlockSyntax(
        `Only global states from other blocks can be used in selectors: ${rule.selector}`,
        selectorSourceLocation(block.source, rule, obj.node));
    }

    // If referened block does not exist, throw.
    let otherBlock = block.getReferencedBlock(obj.blockName);
    if (!otherBlock) {
      throw new errors.InvalidBlockSyntax(
        `No block named ${obj.blockName} found: ${rule.selector}`,
        selectorSourceLocation(block.source, rule, obj.node));
    }

    // If state referenced does not exist on external block, throw
    let stateInfo = stateParser(<selectorParser.Attribute>obj.node);
    let otherState = otherBlock.states._getState(stateInfo);
    if (!otherState) {
      throw new errors.InvalidBlockSyntax(
        `No state ${obj.node.toString()} found in : ${rule.selector}`,
        selectorSourceLocation(block.source, rule, obj.node));
    }

    // If external state is not set as global, throw.
    if (!otherState.isGlobal) {
      throw new errors.InvalidBlockSyntax(
        `${obj.node.toString()} is not global: ${rule.selector}`,
        selectorSourceLocation(block.source, rule, obj.node));
    }

  }

  /**
   * Assert that a provided selector follows all the combinator rules required
   * of block declarations.
   * @param block The block in this selector belongs to.
   * @param rule The PostCSS Rule.
   * @param selector The `ParsedSelector` to verify.
   */
  private assertValidSelector(block: Block, rule: postcss.Rule, selector: ParsedSelector) {

    // Verify our key selector targets a block object, but not one from an another block.
    let keyObject = this.assertBlockObject(block, selector.key, rule);
    if (keyObject.blockName) {
      throw new errors.InvalidBlockSyntax(
        `Cannot style values from other blocks: ${rule.selector}`,
        selectorSourceLocation(block.source, rule, keyObject.node));
    }

    // Fetch and validate our first `CompoundSelector`
    let currentCompoundSel: CompoundSelector = selector.selector;
    let currentObject = this.assertBlockObject(block, currentCompoundSel, rule);

    // Init caches to cumulatively track what we've discovered in the selector
    // as we iterate over each `CompoundSelector` inside it.
    let foundRootLevel = this.isRootLevelObject(currentObject);
    let foundClassLevel = this.isClassLevelObject(currentObject);
    let foundObjects: NodeAndType[] = [currentObject];
    let foundCombinators: string[] = [];

    // For each `CompoundSelector` in this rule:
    while (currentCompoundSel.next) {

      // Fetch and validate the next `CompoundSelector`
      let combinator = currentCompoundSel.next.combinator.value;
      foundCombinators.push(combinator);
      let nextCompoundSel = currentCompoundSel.next.selector;
      let nextObject = this.assertBlockObject(block, nextCompoundSel, rule);
      let nextLevelIsRoot = this.isRootLevelObject(nextObject);
      let nextLevelIsClass = this.isClassLevelObject(nextObject);

      // Verify that external blocks referenced have been imported, have defined
      // the state being selected, and have marked it as a global state.
      if (currentObject.blockName) {
        this.assertForeignGlobalState(block, rule, currentObject);
      }

      // Don't allow weird combinators like the column combinator (`||`)
      // or the attribute target selector (e.g. `/for/`)
      if (!LEGAL_COMBINATORS.has(combinator)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal Combinator '${combinator}': ${rule.selector}`,
          selectorSourceLocation(block.source, rule, currentCompoundSel.next.combinator));
      }

      // Class level objects cannot be ancestors of root level objects
      if (    this.isClassLevelObject(currentObject)
           && this.isRootLevelObject(nextObject)
           && SIBLING_COMBINATORS.has(combinator)){
          throw new errors.InvalidBlockSyntax(
            `A class is never a sibling of a ${this.objectTypeName(nextObject.blockType)}: ${rule.selector}`,
            selectorSourceLocation(block.source, rule, selector.selector.nodes[0]));
      }

      // Once you go to the class level there's no combinator that gets you back to the root level
      if (foundClassLevel && nextLevelIsRoot) {
        throw new errors.InvalidBlockSyntax(
          `Illegal scoping of a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
          selectorSourceLocation(block.source, rule, currentCompoundSel.next.combinator));
      }

      // You can't reference a new root level object once you introduce descend the hierarchy
      if (foundRootLevel && nextLevelIsRoot && foundCombinators.some(c => HIERARCHICAL_COMBINATORS.has(c))) {
        // unless it's only referencing the same object.
        if (!foundObjects.every(f => f.node.toString() === nextObject.node.toString())) {
          throw new errors.InvalidBlockSyntax(
            `Illegal scoping of a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
            selectorSourceLocation(block.source, rule, currentCompoundSel.next.combinator));
        }
      }

      // class-level and root-level objects cannot be siblings.
      if (nextLevelIsClass && this.isRootLevelObject(currentObject) && SIBLING_COMBINATORS.has(combinator)) {
        throw new errors.InvalidBlockSyntax(
          `A ${this.objectTypeName(nextObject.blockType)} cannot be a sibling with a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
          selectorSourceLocation(block.source, rule, currentCompoundSel.next.combinator));
      }

      // Class-level objects cannot be combined with each other. only with themselves.
      if (this.isClassLevelObject(nextObject)) {
        let conflictObj = foundObjects.find(obj => this.isClassLevelObject(obj) && obj.node.toString() !== nextObject.node.toString());
        if (conflictObj) {
          // slightly better error verbage for objects of the same type.
          if (conflictObj.blockType === nextObject.blockType) {
            throw new errors.InvalidBlockSyntax(
              `Distinct ${this.objectTypeName(conflictObj.blockType, {plural: true})} cannot be combined: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, nextObject.node));
          } else {
            throw new errors.InvalidBlockSyntax(
              `Cannot combine a ${this.objectTypeName(conflictObj.blockType)} with a ${this.objectTypeName(nextObject.blockType)}}: ${rule.selector}`,
              selectorSourceLocation(block.source, rule, nextObject.node));
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
}
