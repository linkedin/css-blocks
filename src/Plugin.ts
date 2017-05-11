import * as postcss from "postcss";
import * as selectorParser from "postcss-selector-parser";
import { PluginOptions, OptionsReader } from "./options";
import { MergedObjectMap, Exportable, Block, StateInfo, State, BlockClass } from "./Block";
export { PluginOptions } from "./options";
import * as errors from "./errors";
import { ImportedFile } from "./importing";
import { QueryKeySelector } from "./query";
import parseSelector, { ParsedSelector, SelectorNode } from "./parseSelector";

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
const selectorParserFn = require("postcss-selector-parser");

enum BlockTypes {
  block = 1,
  state,
  class,
  substate
}

type BlockObject = Block | State | BlockClass;

function ensureBlockObject(obj: BlockObject | undefined, key: string, source: errors.SourceLocation | undefined): BlockObject {
  if (obj === undefined) {
    // TODO: Better value source location for the bad block object reference.
    throw new errors.InvalidBlockSyntax(`Cannot find ${key}`, source);
  } else {
    return obj;
  }
}

const RESOLVE_RE = /resolve\(("|')([^\1]*)\1\)/;

export class Plugin {
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
                                                  this.sourceLocation(block.source, decl));
            }
            foundOtherValue = idx;
            otherDecls.push(otherDecl);
          }
        });
        if (foundOtherValue === null) {
          throw new errors.InvalidBlockSyntax(`Cannot resolve ${decl.prop} without a concrete value.`, this.sourceLocation(block.source, decl));
        }
        let curSel = parseSelector((<postcss.Rule>decl.parent).selector);
        let prop = decl.prop;
        let referenceStr = resolveDeclarationMatch[2];
        let other = ensureBlockObject(block.lookup(referenceStr), referenceStr, decl.source.start);
        if (other === undefined) {
        }
        let root = other.block.root;
        if (root === undefined) {
          // This should never happen, but it satisfies the compiler.
          throw new TypeError(`Cannot resolve. The block for ${referenceStr} is missing a stylesheet root`);
        }
        let query = new QueryKeySelector(other);
        let result = query.execute(root);
        curSel.forEach((cs) => {
          result.key.forEach((s) => {
            let newSel = this.addToKey(s.parsedSelector, cs.key);
            let newRule = postcss.rule({ selector: newSel });
            if (isOverride) {
              s.rule.walkDecls(decl.prop, (overrideDecl) => {
                if (!overrideDecl.value.match(RESOLVE_RE)) {
                  newRule.append(postcss.decl({ prop: prop, value: overrideDecl.value }));
                }
              });
            } else {
              otherDecls.forEach((otherDecl) => {
                newRule.append(postcss.decl({ prop: prop, value: otherDecl.value }));
              });
            }
            decl.parent.parent.insertAfter(decl.parent, newRule);
          });
        });
        decl.remove();
      }
    });
  }

  private addToKey(s: ParsedSelector, obj: BlockObject | SelectorNode[]): string {
    let aSel: (SelectorNode | string)[] = s.context !== undefined ? s.context : [];
    if (s.combinator !== undefined) {
      aSel.push(s.combinator);
    }
    if (Array.isArray(obj)) {
      aSel = aSel.concat(s.key);
      aSel.push(obj.join('')); // TODO need to filter all pseudos to the end.
    } else {
      aSel.push(`.${obj.cssClass(this.opts)}`);
      aSel = aSel.concat(s.key);
    }
    if (s.pseudoelement !== undefined) {
      aSel.push(s.pseudoelement);
    }
    return aSel.join('');
  }

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
          this.sourceLocation(sourceFile, atRule));
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
              this.sourceLocation(sourceFile, atRule));
          }
          let localName = md[1];
          let outputTo = md[2];
          let ref: Block | null = block.getReferencedBlock(localName);
          if (!ref) {
            throw new errors.InvalidBlockSyntax(
              `No block named ${localName} exists in this context.`,
              this.sourceLocation(sourceFile, atRule));
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
                                            this.sourceLocation(sourceFile, decl));
      }
      let baseName = decl.value;
      let baseBlock = block.getReferencedBlock(baseName);
      if (!baseBlock) {
        throw new errors.InvalidBlockSyntax(`No block named ${baseName} found`,
                                            this.sourceLocation(sourceFile, decl));
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
                                              this.sourceLocation(sourceFile, decl));
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
            if (s.type === selectorParser.PSEUDO && s.value === ":block") {
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
            else if (s.type === selectorParser.PSEUDO && s.value === ":state") {
              let state = block.ensureState(this.stateParser(sourceFile, rule, s));
              if (s.parent === individualSelector) {
                thisNode = state;
              }
              if (mutate) {
                replacements.push(this.mutate(state, s, individualSelector, (newClass) => {
                  thisSel = newClass;
                }));
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
            }
            else if (s.type === selectorParser.PSEUDO && s.value === ":substate") {
              if (s.parent !== individualSelector) {
                throw new errors.InvalidBlockSyntax(
                  `Illegal use of :substate() in \`${rule.selector}\``,
                  this.selectorSourceLocation(sourceFile, rule, s));
              }
              if (lastNode instanceof BlockClass) {
                let blockClass: BlockClass = lastNode;
                let substate: State = blockClass.ensureState(this.stateParser(sourceFile, rule, s));
                thisNode = substate;
                if (mutate) {
                  replacements.push(this.mutate(substate, s, individualSelector, (newClass) => {
                    thisSel = newClass;
                  }));
                  replacements.push([lastSel, null]);
                }
              } else {
                throw new errors.InvalidBlockSyntax(
                  `:substate() must immediately follow a block class in \`${rule.selector}\``,
                  this.selectorSourceLocation(sourceFile, rule, s));
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
          this.sourceLocation(sourceFile, decl));
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

  addSourceLocations(...locations: errors.SourceLocation[]) {
    return locations.reduce((l, o) => {
      if (o.line === 1) {
        return {
          line: l.line,
          column: l.column + o.column - 1
        };
      } else {
        return {
          line: l.line + o.line - 1,
          column: o.column
        };
      }
    });
  }

  sourceLocation(sourceFile, node): errors.SourceLocation | void {
    if (node.source) {
      let loc = node.source.start;
      return {
        filename: sourceFile,
        line: loc.line,
        column: loc.column
      };
    }
  }

  selectorSourceLocation(sourceFile: string, rule, selector): errors.SourceLocation | void {
    if (rule.source && rule.source.start && selector.source && selector.source.start) {
      let loc = this.addSourceLocations(rule.source.start, selector.source.start);
      return {
        filename: sourceFile,
        line: loc.line,
        column: loc.column
      };
    }
  }

  private stateParser(sourceFile: string, rule, pseudo): StateInfo {
    if (pseudo.nodes.length === 0) {
      // Empty state name or missing parens
      throw new errors.InvalidBlockSyntax(`:state name is missing`,
                                       this.selectorSourceLocation(sourceFile, rule, pseudo));
    }
    if (pseudo.nodes.length !== 1) {
      // I think this is if they have a comma in their :state like :state(foo, bar)
      throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                       this.selectorSourceLocation(sourceFile, rule, pseudo));
    }

    switch(pseudo.nodes[0].nodes.length) {
      case 3:
        return {
          group: pseudo.nodes[0].nodes[0].value.trim(),
          name: pseudo.nodes[0].nodes[2].value.trim()
        };
      case 1:
        return {
          name: pseudo.nodes[0].nodes[0].value.trim()
        };
      default:
        // too many state names
        throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                         this.selectorSourceLocation(sourceFile, rule, pseudo));
    }
  }

  assertValidCombinators(sourceFile: string, rule, selector) {
    let states = new Set<string>();
    let classes = new Set<string>();
    let combinators = new Set<string>();
    let lastType: BlockTypes | null = null;
    let thisType: BlockTypes | null = null;
    selector.each((s) => {
      if (s.type === selectorParser.PSEUDO && s.value === ":block") {
        thisType = BlockTypes.block;
      } else if (s.type === selectorParser.PSEUDO && s.value === ":state") {
        thisType = BlockTypes.state;
        let info = this.stateParser(sourceFile, rule, s);
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
            this.selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
        }
        throw new errors.InvalidBlockSyntax(
          `Cannot have ${BlockTypes[lastType]} and ${BlockTypes[thisType]} on the same DOM element: ${rule.selector}`,
          this.selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
      }
      lastType = thisType;
    });
    if (combinators.size > 0 && states.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct states cannot be combined: ${rule.selector}`,
                                         this.selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
    }
    if (classes.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct classes cannot be combined: ${rule.selector}`,
                                         this.selectorSourceLocation(sourceFile, rule, selector.nodes[0]));
    }
  }
}
