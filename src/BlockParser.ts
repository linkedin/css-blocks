import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");
import { PluginOptions, OptionsReader } from "./options";
import { Block } from "./Block";
import * as errors from "./errors";
import { ImportedFile } from "./importing";
export { PluginOptions } from "./options";
import { sourceLocation, selectorSourceLocation } from "./SourceLocation";
import parseSelector, { ParsedSelector, CompoundSelector } from "./parseSelector";

const SIBLING_COMBINATORS = new Set(["+", "~"]);
const HIERARCHICAL_COMBINATORS = new Set([" ", ">"]);
const LEGAL_COMBINATORS = new Set(["+", "~", " ", ">"]);

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
// const selectorParserFn = require("postcss-selector-parser");

enum BlockTypes {
  block = 1,
  state,
  class,
  classState
}

interface NodeAndType {
  blockType: BlockTypes;
  node: selectorParser.Node;
}

export function isBlock(node: selectorParser.Node) {
  return node.type === selectorParser.CLASS &&
         node.value === "root";
}

export function isState(node: selectorParser.Node) {
  return node.type === selectorParser.ATTRIBUTE &&
         (<selectorParser.Attribute>node).namespace === "state";
}

export function isClass(node: selectorParser.Node) {
  return node.type === selectorParser.CLASS;
}

export interface StateInfo {
  group?: string;
  name: string;
}

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

export default class BlockParser {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  public parse(root: postcss.Root, sourceFile: string, defaultName: string): Promise<Block> {
    root.walkDecls((decl) => {
      if (decl.important) {
        throw new errors.InvalidBlockSyntax(
          `!important is not allowed for \`${decl.prop}\` in \`${(<postcss.Rule>decl.parent).selector}\``,
          sourceLocation(sourceFile, decl));
      }
    });

    let block = new Block(defaultName, sourceFile);
    block.root = root;
    return this.resolveReferences(block, root, sourceFile).then((block) => {
      root.walkRules((rule) => {
        let selector =  selectorParser().process(rule.selector).res;
        let parsedSelectors = parseSelector(selector);
        block.parsedRuleSelectors.set(rule, parsedSelectors);
        parsedSelectors.forEach((iSel) => {
          this.assertValidCombinators(sourceFile, rule, iSel);
          let currentCompoundSel: CompoundSelector | undefined = iSel.selector;
          while (currentCompoundSel) {
            let obj = this.getBlockObject(currentCompoundSel);
            if (obj) {
              switch (obj.blockType) {
                case BlockTypes.block:
                  if (obj.node.next() === undefined && obj.node.prev() === undefined) {
                    this.extendBlock(block, sourceFile, rule);
                    this.implementsBlock(block, sourceFile, rule);
                  }
                  break;
                case BlockTypes.state:
                  block.ensureState(stateParser(<selectorParser.Attribute>obj.node));
                  break;
                case BlockTypes.class:
                  block.ensureClass(obj.node.value);
                  break;
                case BlockTypes.classState:
                  let classNode = obj.node.prev();
                  let classObj = block.ensureClass(classNode.value);
                  classObj.ensureState(stateParser(<selectorParser.Attribute>obj.node));
                  break;
              }
            }
            currentCompoundSel = currentCompoundSel.next && currentCompoundSel.next.selector;
          }
        });
      });

      block.checkImplementations();
      return block;
    });
  }

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

  private extendBlock(block: Block, sourceFile: string, rule: postcss.Rule) {
    rule.walkDecls("extends", (decl) => {
      if (block.base) {
        throw new errors.InvalidBlockSyntax(`A block can only be extended once.`,
                                            sourceLocation(sourceFile, decl));
      }
      let baseName = decl.value;
      let baseBlock = block.getReferencedBlock(baseName);
      if (!baseBlock) {
        throw new errors.InvalidBlockSyntax(`No block named ${baseName} found`,
                                            sourceLocation(sourceFile, decl));
      }
      block.base = baseBlock;
    });
  }

  public resolveReferences(block: Block, root: postcss.Root, sourceFile: string): Promise<Block> {
    let namedBlockReferences: Promise<[string, Block]>[] = [];
    root.walkAtRules("block-reference", (atRule) => {
      let md = atRule.params.match(/\s*((\w+)\s+from\s+)?\s*("|')([^\3]+)\3/);
      if (!md) {
        throw new errors.InvalidBlockSyntax(
          `Malformed block reference: \`@block-reference ${atRule.params}\``,
          sourceLocation(sourceFile, atRule));
      }
      let importPath = md[4];
      let localName = md[2];
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
    return Promise.all(namedBlockReferences).then((results) => {
      results.forEach(([localName, otherBlock]) => {
        block.addBlockReference(localName || otherBlock.name, otherBlock);
      });
    }).then(() => {
      return block;
    });
  }

  processDebugStatements(sourceFile: string, root: postcss.Root, block: Block) {
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

  private assertValidState(sourceFile: string, rule: postcss.Rule, attr: selectorParser.Attribute) {
    if (attr.value && attr.operator !== "=") {
      throw new errors.InvalidBlockSyntax(`A state with a value must use the = operator (found ${attr.operator} instead).`,
                                          selectorSourceLocation(sourceFile, rule, attr));
    }
  }

  // Similar to assertBlockObject except it doesn't check for well-formedness
  // and doesn't ensure that you get a block object when not a legal selector.
  private getBlockObject(sel: CompoundSelector): NodeAndType | null {
    let n = sel.nodes.find(n => isBlock(n));
    if (n) {
      return {
        blockType: BlockTypes.block,
        node: n
      };
    }
    n = sel.nodes.find(n => isState(n));
    if (n) {
      let prev = n.prev();
      if (prev && isClass(prev)) {
        return {
          blockType: BlockTypes.classState,
          node: n
        };
      } else {
        return {
          blockType: BlockTypes.state,
          node: n
        };
      }
    }
    n = sel.nodes.find(n => isClass(n));
    if (n) {
      return {
        blockType: BlockTypes.class,
        node: n
      };
    } else {
      return null;
    }
  }

  // TODO Add support for external selectors
  private assertBlockObject(sel: CompoundSelector, sourceFile: string, rule: postcss.Rule): NodeAndType {
    let nonStateAttribute = sel.nodes.find(n => n.type === selectorParser.ATTRIBUTE && !isState(n));
    if (nonStateAttribute) {
      if ((<selectorParser.Attribute>nonStateAttribute).attribute.match(/state:/)) {
        throw new errors.InvalidBlockSyntax(
          `State attribute selctors use a \`|\`, not a \`:\` which is illegal CSS syntax and won't work in other parsers: ${rule.selector}`,
          selectorSourceLocation(sourceFile, rule, nonStateAttribute));
      } else {
        throw new errors.InvalidBlockSyntax(
          `Cannot select attributes other than states: ${rule.selector}`,
          selectorSourceLocation(sourceFile, rule, nonStateAttribute));
      }
    }
    let result = sel.nodes.reduce<NodeAndType|null>((found, n) => {
      if (isBlock(n)) {
        if (found === null) {
          found = {
            blockType: BlockTypes.block,
            node: n
          };
        } else {
          if (found.blockType === BlockTypes.class || found.blockType === BlockTypes.classState) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, sel.nodes[0]));
          } else if (found.blockType === BlockTypes.state) {
            throw new errors.InvalidBlockSyntax(
              `It's redundant to specify a state with the an explicit .root: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, n));
          }
        }
      } else if (isState(n)) {
        this.assertValidState(sourceFile, rule, <selectorParser.Attribute>n);
        if (!found) {
          found = {
            node: n,
            blockType: BlockTypes.state
          };
        } else if (found.blockType === BlockTypes.class) {
          found = {
            node: n,
            blockType: BlockTypes.classState
          };
        } else if (found.blockType === BlockTypes.state || found.blockType === BlockTypes.classState) {
          if (n.toString() !== found.node.toString()) {
            throw new errors.InvalidBlockSyntax(
              `Two distinct states cannot be selected on the same element: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, n));
          }
        } else if (found.blockType === BlockTypes.block) {
            throw new errors.InvalidBlockSyntax(
              `It's redundant to specify a state with an explicit .root: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, found.node));
        }
      } else if (isClass(n)) {
        if (!found) {
          found = {
            node: n,
            blockType: BlockTypes.class
          };
        } else {
          if (found.blockType === BlockTypes.block) {
            throw new errors.InvalidBlockSyntax(
              `${n} cannot be on the same element as ${found.node}: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, sel.nodes[0]));
          } else if (found.blockType === BlockTypes.class) {
            if (n.toString() !== found.node.toString()) {
              throw new errors.InvalidBlockSyntax(
                `Two distinct classes cannot be selected on the same element: ${rule.selector}`,
                selectorSourceLocation(sourceFile, rule, n));
            }
          } else if (found.blockType === BlockTypes.classState || found.blockType === BlockTypes.state) {
            throw new errors.InvalidBlockSyntax(
              `The class must precede the state: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, sel.nodes[0]));
          }
        }
      }
      return found;
    }, null);
    if (!result) {
      throw new errors.InvalidBlockSyntax(
        `Missing block object in selector component '${sel.nodes.join('')}': ${rule.selector}`,
        selectorSourceLocation(sourceFile, rule, sel.nodes[0]));
    } else {
      return result;
    }
  }

  private objectTypeName(t: BlockTypes, options?: {plural: boolean}): string {
    if (options && options.plural) {
      switch(t) {
        case BlockTypes.block: return "block roots";
        case BlockTypes.state: return "root-level states";
        case BlockTypes.class: return "classes";
        case BlockTypes.classState: return "class states";
        default: return "¯\_(ツ)_/¯";
      }
    } else {
      switch(t) {
        case BlockTypes.block: return "block root";
        case BlockTypes.state: return "root-level state";
        case BlockTypes.class: return "class";
        case BlockTypes.classState: return "class state";
        default: return "¯\_(ツ)_/¯";
      }
    }
  }

  private isRootLevelObject(object: NodeAndType): boolean {
    return object.blockType === BlockTypes.block || object.blockType === BlockTypes.state;
  }
  private isClassLevelObject(object: NodeAndType): boolean {
    return object.blockType === BlockTypes.class || object.blockType === BlockTypes.classState;
  }

  private assertValidCombinators(sourceFile: string, rule: postcss.Rule, selector: ParsedSelector) {
    let currentCompoundSel: CompoundSelector = selector.selector;
    let currentObject = this.assertBlockObject(currentCompoundSel, sourceFile, rule);
    let foundRootLevel = this.isRootLevelObject(currentObject);
    let foundClassLevel = this.isClassLevelObject(currentObject);
    let foundObjects: NodeAndType[] = [currentObject];
    let foundCombinators: string[] = [];

    while (currentCompoundSel.next) {
      let combinator = currentCompoundSel.next.combinator.value;
      foundCombinators.push(combinator);
      let nextCompoundSel = currentCompoundSel.next.selector;
      let nextObject = this.assertBlockObject(nextCompoundSel, sourceFile, rule);
      let nextLevelIsRoot = this.isRootLevelObject(nextObject);
      let nextLevelIsClass = this.isClassLevelObject(nextObject);
      // Don't allow weird combinators like the column combinator (`||`)
      // or the attribute target selector (e.g. `/for/`)
      if (!LEGAL_COMBINATORS.has(combinator)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal Combinator '${combinator}': ${rule.selector}`,
          selectorSourceLocation(sourceFile, rule, currentCompoundSel.next.combinator));
      }
      // class level objects cannot be ancestors of root level objects
      if (this.isClassLevelObject(currentObject) && this.isRootLevelObject(nextObject) && SIBLING_COMBINATORS.has(combinator))
      {
          throw new errors.InvalidBlockSyntax(
            `A class is never a sibling of a ${this.objectTypeName(nextObject.blockType)}: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.selector.nodes[0]));
      }
      // once you go to the class level there's no combinator that gets you back to the root level
      if (foundClassLevel && nextLevelIsRoot) {
        throw new errors.InvalidBlockSyntax(
          `Illegal scoping of a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
          selectorSourceLocation(sourceFile, rule, currentCompoundSel.next.combinator));
      }
      // You can't reference a new root level object once you introduce descend the hierarchy
      if (foundRootLevel && nextLevelIsRoot && foundCombinators.some(c => HIERARCHICAL_COMBINATORS.has(c))) {
        // unless it's only referencing the same object.
        if (!foundObjects.every(f => f.node.toString() === nextObject.node.toString())) {
          throw new errors.InvalidBlockSyntax(
            `Illegal scoping of a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, currentCompoundSel.next.combinator));
        }
      }
      // class-level and root-level objects cannot be siblings.
      if (nextLevelIsClass && this.isRootLevelObject(currentObject) && SIBLING_COMBINATORS.has(combinator)) {
        throw new errors.InvalidBlockSyntax(
          `A ${this.objectTypeName(nextObject.blockType)} cannot be a sibling with a ${this.objectTypeName(currentObject.blockType)}: ${rule.selector}`,
          selectorSourceLocation(sourceFile, rule, currentCompoundSel.next.combinator));
      }
      if (this.isClassLevelObject(nextObject)) {
        // class-level objects cannot be combined with each other. only with themselves.
        let conflictObj = foundObjects.find(obj => this.isClassLevelObject(obj) && obj.node.toString() !== nextObject.node.toString());
        if (conflictObj) {
          // slightly better error verbage for objects of the same type.
          if (conflictObj.blockType === nextObject.blockType) {
            throw new errors.InvalidBlockSyntax(
              `Distinct ${this.objectTypeName(conflictObj.blockType, {plural: true})} cannot be combined: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, nextObject.node));
          } else {
            throw new errors.InvalidBlockSyntax(
              `Cannot combine a ${this.objectTypeName(conflictObj.blockType)} with a ${this.objectTypeName(nextObject.blockType)}}: ${rule.selector}`,
              selectorSourceLocation(sourceFile, rule, nextObject.node));
          }
        }
      }
      foundObjects.push(nextObject);
      foundRootLevel = foundRootLevel || nextLevelIsRoot;
      foundClassLevel = foundClassLevel || nextLevelIsClass;
      currentObject = nextObject;
      currentCompoundSel = nextCompoundSel;
    }
  }
}