import * as postcss from "postcss";
import * as selectorParser from "postcss-selector-parser";
import { PluginOptions, OptionsReader } from "./options";
import { Exportable, Block, State, BlockClass, BlockObject } from "./Block";
import * as errors from "./errors";
import { ImportedFile } from "./importing";
export { PluginOptions } from "./options";
import { sourceLocation, selectorSourceLocation } from "./SourceLocation";

const siblingCombinators = new Set(["~", "+"]);

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
const selectorParserFn = require("postcss-selector-parser");

enum BlockTypes {
  block = 1,
  state,
  class,
  classState
}

export function isBlock(node) {
  return node.type === selectorParser.CLASS &&
         node.value === "root";
}

export function isState(node) {
  return node.type === selectorParser.ATTRIBUTE &&
         node.namespace === "state";
}

export interface StateInfo {
  group?: string;
  name: string;
}

export function stateParser(sourceFile: string, rule, attr): StateInfo {
  let stateType = attr.namespace;
  let info: StateInfo = {
    name: attr.attribute
  };
  if (attr.value) {
    if (attr.operator !== "=") {
      throw new errors.InvalidBlockSyntax(`A ${stateType} with a value must use the = operator (found ${attr.operator} instead).`,
                                          selectorSourceLocation(sourceFile, rule, attr));
    }
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

  public parse(root: postcss.Root, sourceFile: string, defaultName: string, mutate: boolean): Promise<Block> {
    root.walkDecls((decl) => {
      if (decl.important) {
        throw new errors.InvalidBlockSyntax(
          `!important is not allowed for \`${decl.prop}\` in \`${(<postcss.Rule>decl.parent).selector}\``,
          sourceLocation(sourceFile, decl));
      }
    });

    let block = new Block(defaultName, sourceFile);
    block.root = root;
    return this.resolveReferences(block, root, sourceFile, mutate).then((block) => {
      root.walkRules((rule) => {
        let selector =  selectorParserFn().process(rule.selector).res;
        selector.nodes.forEach((sel) => { this.assertValidCombinators(sourceFile, rule, sel); });
        // mutation can't be done inside the walk despite what the docs say
        let replacements: any[] = [];
        let lastSel: any;
        let thisSel: any;
        let lastNode: BlockObject | null = null;
        let thisNode: BlockObject | null = null;
        selector.each((individualSelector) => {
          individualSelector.walk((s) => {
            if (isBlock(s)) {
              if (s.next() === undefined && s.prev() === undefined) {
                this.extendBlock(block, sourceFile, rule, mutate);
                this.implementsBlock(block, sourceFile, rule, mutate);
              }
              if (s.parent === individualSelector) {
                thisNode = block;
              }
              if (mutate) {
                replacements.push(this.mutate(block, s, individualSelector, (newClass) => {
                  thisSel = newClass;
                }));
              }
            }
            else if (isState(s)) {
              if (lastNode instanceof BlockClass) {
                let blockClass: BlockClass = lastNode;
                let state: State = blockClass.ensureState(stateParser(sourceFile, rule, s));
                thisNode = state;
                if (mutate) {
                  replacements.push(this.mutate(state, s, individualSelector, (newClass) => {
                    thisSel = newClass;
                  }));
                  replacements.push([lastSel, null]);
                }
              } else {
                let state = block.ensureState(stateParser(sourceFile, rule, s));
                if (s.parent === individualSelector) {
                  thisNode = state;
                }
                if (mutate) {
                  replacements.push(this.mutate(state, s, individualSelector, (newClass) => {
                    thisSel = newClass;
                  }));
                }
              }
            }
            else if (s.type === selectorParser.CLASS) {
              let blockClass = block.ensureClass(s.value);
              if (s.parent === individualSelector) {
                thisNode = blockClass;
              }
              if (mutate) {
                replacements.push(this.mutate(blockClass, s, individualSelector, (newClass) => {
                  thisSel = newClass;
                }));
              }
            } else if (s.parent === individualSelector) {
              thisNode = null;
              thisSel = null;
            }

            if (s.parent === individualSelector) {
              lastNode = thisNode;
              lastSel = thisSel;
            }
          });
        });
        if (mutate) {
          replacements.forEach((pair) => {
            let existing = pair[0];
            let replacement = pair[1];
            if (replacement) {
              existing.replaceWith(replacement);
            } else {
              existing.remove();
            }
          });
        }
        rule.selector = selector.toString();
      });
      block.checkImplementations();
      return block;
    });
  }

  private implementsBlock(block: Block, sourceFile: string, rule: postcss.Rule, mutate: boolean) {
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
      if (mutate) { decl.remove(); }
    });
  }

  private extendBlock(block: Block, sourceFile: string, rule: postcss.Rule, mutate: boolean) {
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
      if (mutate) { decl.remove(); }
    });
  }

  public resolveReferences(block: Block, root: postcss.Root, sourceFile: string, mutate: boolean): Promise<Block> {
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
        return this.parse(otherRoot, importedFile.path, importedFile.defaultName, false);
      });
      let namedResult: Promise<[string, Block]> = extractedResult.then((referencedBlock) => {
        return [localName, referencedBlock];
      });
      namedBlockReferences.push(namedResult);
    });
    let extraction = Promise.all(namedBlockReferences).then((results) => {
      results.forEach(([localName, otherBlock]) => {
        block.addBlockReference(localName || otherBlock.name, otherBlock);
      });
    });
    if (mutate) {
      extraction.then(() => {
        root.walkAtRules("block-reference", (atRule) => {
          atRule.remove();
        });
      });
    }
    return extraction.then(() => {
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

  private assertValidCombinators(sourceFile: string, rule, selector) {
    let states = new Set<string>();
    let classes = new Set<string>();
    let classStates = new Set<string>();
    let combinators = new Set<string>();
    let thisElementIsRoot = false;
    let lastElementIsRoot = false;
    let lastType: BlockTypes | null = null;
    let thisType: BlockTypes | null = null;
    let lastCombinator: string | null;
    selector.each((s) => {
     if (isBlock(s)) {
        thisType = BlockTypes.block;
        thisElementIsRoot = true;
      } else if (isState(s)) {
        let info = stateParser(sourceFile, rule, s);
        let stateStr: string;
        if (info.group) {
          stateStr = `${info.group} ${info.name}`;
        } else {
          stateStr = info.name;
        }
        if (lastType === BlockTypes.class) {
          thisElementIsRoot = false;
          thisType = BlockTypes.classState;
          classStates.add(stateStr);
        } else {
          thisElementIsRoot = true;
          thisType = BlockTypes.state;
          states.add(stateStr);
        }
      } else if (s.type === selectorParser.CLASS) {
        if (thisElementIsRoot && lastCombinator !== null && siblingCombinators.has(lastCombinator)) {
          throw new errors.InvalidBlockSyntax(
            `A class is never a sibling of a state: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        }
        thisElementIsRoot = false;
        thisType = BlockTypes.class;
        classes.add(s.value);
      } else if (s.type === selectorParser.COMBINATOR) {
        thisType = null;
        combinators.add(s.value);
        lastCombinator = s.value;
        if (!siblingCombinators.has(s.value)) {
          lastElementIsRoot = thisElementIsRoot;
          thisElementIsRoot = false;
        }
      }
      if (thisType && lastType && lastType !== thisType) {
        if ((lastType === BlockTypes.block && thisType === BlockTypes.state) ||
            (thisType === BlockTypes.block && lastType === BlockTypes.state)) {
          throw new errors.InvalidBlockSyntax(
            `It's redundant to specify state with the block root: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        }
        if (lastType === BlockTypes.state && thisType === BlockTypes.class) {
          throw new errors.InvalidBlockSyntax(
            `The class must precede the state: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        } else if (!(lastType === BlockTypes.class && thisType === BlockTypes.classState)) {
          throw new errors.InvalidBlockSyntax(
            `Cannot have ${BlockTypes[lastType]} and ${BlockTypes[thisType]} on the same DOM element: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        }
      }
      lastType = thisType;
    });
    if (combinators.size > 0 && states.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct states cannot be combined: ${rule.selector}`,
                                         selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
    }
    if (classes.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct classes cannot be combined: ${rule.selector}`,
                                         selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
    }
  }

  private mutate(e: Exportable, selComponent, selector, contextCB: (newClass:any) => void) {
    let newClass = selectorParser.className({value: e.cssClass(this.opts)});
    if (selComponent.parent === selector) { contextCB(newClass); }
    return [selComponent, newClass];
  }
}