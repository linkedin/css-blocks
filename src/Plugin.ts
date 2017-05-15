import * as postcss from "postcss";
import * as selectorParser from "postcss-selector-parser";
import { PluginOptions, OptionsReader } from "./options";
import { MergedObjectMap, Exportable, Block, State, BlockClass } from "./Block";
export { PluginOptions } from "./options";
import * as errors from "./errors";
import { ImportedFile } from "./importing";
import { QueryKeySelector } from "./query";
import parseSelector, { ParsedSelector, SelectorNode, stateParser, isBlock, isState } from "./parseSelector";
import { SourceLocation, sourceLocation, selectorSourceLocation } from "./SourceLocation";

type stringMap = {[combinator: string]: string};
type combinatorMap = {[combinator: string]: stringMap};

enum ConflictType {
  conflict,
  noconflict,
  samevalues
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

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
const selectorParserFn = require("postcss-selector-parser");

enum BlockTypes {
  block = 1,
  state,
  class
}

type BlockObject = Block | State | BlockClass;

function assertBlockObject(obj: BlockObject | undefined, key: string, source: SourceLocation | undefined): void {
  if (obj === undefined) {
    // TODO: Better value source location for the bad block object reference.
    throw new errors.InvalidBlockSyntax(`Cannot find ${key}`, source);
  }
}

const RESOLVE_RE = /resolve\(("|')([^\1]*)\1\)/;

export class Plugin {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  mutate(e: Exportable, selComponent, selector, contextCB: (newClass:any) => void) {
    let newClass = selectorParser.className({value: e.cssClass(this.opts)});
    if (selComponent.parent === selector) { contextCB(newClass); }
    return [selComponent, newClass];
  }

  public resolveReferences(block: Block, root, sourceFile: string, mutate: boolean): Promise<Block> {
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
        return this.extractBlockDefinition(otherRoot, importedFile.path, importedFile.defaultName, false);
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
      });
    }
    return extraction.then(() => {
      return block;
    });
  }

  private extendBlock(block: Block, sourceFile: string, rule, mutate: boolean) {
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

  private implementsBlock(block: Block, sourceFile: string, rule, mutate: boolean) {
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

  public extractBlockDefinition(root, sourceFile: string, defaultName: string, mutate: boolean): Promise<Block> {
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

  public process(root, result) {
    let sourceFile;
    if (result && result.opts && result.opts.from) {
      sourceFile = result.opts.from;
    } else {
      throw new errors.MissingSourcePath();
    }
    root.walkDecls((decl) => {
      if (decl.important) {
        throw new errors.InvalidBlockSyntax(
          `!important is not allowed for \`${decl.prop}\` in \`${decl.parent.selector}\``,
          sourceLocation(sourceFile, decl));
      }
    });
    let defaultName: string = this.opts.importer.getDefaultName(sourceFile);
    return this.extractBlockDefinition(root, sourceFile, defaultName, true).then((block) => {
      this.resolveConflicts(root, block);
      if (this.opts.interoperableCSS) {
        let exportsRule = this.postcss.rule({selector: ":export"});
        root.prepend(exportsRule);
        let objsMap: MergedObjectMap = block.merged();
        Object.keys(objsMap).forEach((name) => {
          let objs = objsMap[name];
          exportsRule.append(this.postcss.decl({
            prop: objs[0].localName(),
            value: objs.map(obj => obj.cssClass(this.opts)).join(" ")
          }));
        });
      }
    });
  }

  assertValidCombinators(sourceFile: string, rule, selector) {
    let states = new Set<string>();
    let classes = new Set<string>();
    let combinators = new Set<string>();
    let lastType: BlockTypes | null = null;
    let thisType: BlockTypes | null = null;
    selector.each((s) => {
      if (isBlock(s)) {
        thisType = BlockTypes.block;
      } else if (isState(s)) {
        thisType = BlockTypes.state;
        let info = stateParser(sourceFile, rule, s);
        if (info.group) {
          states.add(`${info.group} ${info.name}`);
        } else {
          states.add(info.name);
        }
      } else if (s.type === selectorParser.CLASS) {
        thisType = BlockTypes.class;
        classes.add(s.value);
      } else if (s.type === selectorParser.COMBINATOR) {
        thisType = null;
        combinators.add(s.value);
      }
      if (thisType && lastType && lastType !== thisType) {
        if ((lastType === BlockTypes.block && thisType === BlockTypes.state) ||
            (thisType === BlockTypes.block && lastType === BlockTypes.state)) {
          throw new errors.InvalidBlockSyntax(
            `It's redundant to specify state with block: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        }
        if (!((lastType === BlockTypes.class && thisType === BlockTypes.state) ||
             (thisType === BlockTypes.class && lastType === BlockTypes.state))) {
          throw new errors.InvalidBlockSyntax(
            `Cannot have ${BlockTypes[lastType]} and ${BlockTypes[thisType]} on the same DOM element: ${rule.selector}`,
            selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        } else if (lastType === BlockTypes.state && thisType === BlockTypes.class) {
          throw new errors.InvalidBlockSyntax(
            `The class must precede the state: ${rule.selector}`,
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
        let newSel = this.mergeSelectors(other.block.rewriteSelector(s.parsedSelector, this.opts), cs);
        if (newSel === null) return;
        let newRule = postcss.rule({ selector: newSel });
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

  resolveConflicts(root: postcss.Container, block: Block) {
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

  private mergeSelectors(s: ParsedSelector, s2: ParsedSelector): string | null {
    if ((s.context && s.context.some(n => n.type === selectorParser.COMBINATOR) && s2.context) ||
        (s2.context && s2.context.some(n => n.type === selectorParser.COMBINATOR) && s.context)) {
          throw new errors.InvalidBlockSyntax(
            `Cannot resolve selectors with more than 1 combinator at this time [FIXME].`);
    }
    let aSel: (SelectorNode | string)[] = [];
    if (s2.context !== undefined) {
      aSel = aSel.concat(s2.context);
    }
    if (s.context !== undefined) {
      aSel = aSel.concat(s.context); // TODO need to filter all pseudos to the end.
    }
    let c = this.mergeCombinators(s.combinator, s2.combinator);
    if (c === null) {
      // If combinators can't be merged, the merged selector can't exist, we skip it.
      return null;
    } else {
      if (c !== undefined) {
        aSel.push(c);
      }
    }
    aSel = aSel.concat(s.key);
    aSel.push(s2.key.join('')); // TODO need to filter all pseudos to the end.
    if (s.pseudoelement !== undefined) {
      aSel.push(s.pseudoelement);
    }
    return aSel.join('');
  }
}