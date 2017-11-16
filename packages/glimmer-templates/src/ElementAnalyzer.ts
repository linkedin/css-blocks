import { AST, builders} from '@glimmer/syntax';
import {
  Block,
  QueryKeySelector,
  ElementAnalysis,
  StateParent,
  PluginOptionsReader as CssBlocksOptionsReader,
  DynamicClasses,
} from "css-blocks";
import { ResolvedFile } from "./GlimmerProject";
import { selectorCount, cssBlockError } from "./utils";
import { SourceLocation, SourcePosition } from "@opticss/template-api";
import { objectValues, assertNever } from "@opticss/util";

export type TernaryExpression = AST.Expression;
export type StringExpression = AST.MustacheStatement | AST.ConcatStatement;
export type BooleanExpression = AST.Expression;
export type TemplateElement  = ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>;
export type AnalysisElement  = ElementAnalysis<null, null, null>;

type RewriteAnalysis = {
  element: TemplateElement,
  storeConditionals: true
} | {
  element: AnalysisElement,
  storeConditionals: false
};

const STATE = /^state:(?:([^.]+)\.)?([^.]+)$/;
const STYLE_IF: 'style-if' = 'style-if';
const STYLE_UNLESS: 'style-unless' = 'style-unless';

export class ElementAnalyzer {
  template: ResolvedFile;
  cssBlocksOpts: CssBlocksOptionsReader;
  block: Block;
  constructor(block: Block, template: ResolvedFile, cssBlocksOpts: CssBlocksOptionsReader) {
    this.block = block;
    this.template = template;
    this.cssBlocksOpts = cssBlocksOpts;
  }
  analyze(node: AST.ElementNode, atRootElement: boolean): AnalysisElement {
    let element = new ElementAnalysis<null, null, null>(nodeLocation(node), node.tag);
    this._analyze(node, atRootElement, {element, storeConditionals: false});
    return element;
  }
  analyzeForRewrite(node: AST.ElementNode, atRootElement: boolean): TemplateElement {
    let element = new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(nodeLocation(node), node.tag);
    this._analyze(node, atRootElement, {element, storeConditionals: true});
    return element;
  }

  private debugBlockPath() {
    return this.cssBlocksOpts.importer.debugIdentifier(this.block.identifier, this.cssBlocksOpts);
  }

  private _analyze(
    node: AST.ElementNode,
    atRootElement: boolean,
    analysis: RewriteAnalysis,
  ) {

    // If there are root styles, we add them on the root element implicitly.
    if (atRootElement) {
      // TODO: don't
      let query = new QueryKeySelector(this.block);
      if (this.block.root) {
        let res = query.execute(this.block.root, this.block);
        if (selectorCount(res) > 0) {
          analysis.element.addStaticClass(this.block);
        }
      }
    }

    // Find the class attribute and process.
    let classAttr: AST.AttrNode | undefined =
      node.attributes.find(n => n.name === "class");

    if (classAttr) this.processClass(classAttr, analysis);

    for (let attribute of node.attributes) {
      if (!STATE.test(attribute.name)) continue;
      this.processState(RegExp.$1, RegExp.$2, attribute, analysis);
    }

    return;
  }

  private lookupClasses(classes: string, node: AST.Node): Array<StateParent> {
    let classNames = classes.trim().split(/\s+/);
    let found = new Array<StateParent>();
    for (let name of classNames) {
      found.push(this.lookupClass(name, node));
    }
    return found;
  }

  private lookupClass(name: string, node: AST.Node): StateParent {
    let found = this.block.lookup(name);
    if (!found && !/\./.test(name)) {
      found = this.block.lookup('.' + name);
    }
    if (found) {
      return <StateParent>found;
    } else {
      if (/\./.test(name)) {
        throw cssBlockError(`No class or block named ${name} is referenced from ${this.debugBlockPath()}`, node, this.template);
      } else {
        throw cssBlockError(`No class or block named ${name}`, node, this.template);
      }
    }
  }

  /**
   * Adds blocks and block classes to the current node from the class attribute.
   */
  private processClass(node: AST.AttrNode, analysis: RewriteAnalysis): void {
    let statements: Array<AST.TextNode | AST.MustacheStatement>;

    if (isConcatStatement(node.value)) {
      statements = node.value.parts;
    } else {
      statements = [node.value];
    }
    for (let statement of statements) {
      if (isTextNode(statement)) {
        for (let container of this.lookupClasses(statement.chars, statement)) {
          analysis.element.addStaticClass(container);
        }
      } else if (isMustacheStatement(statement)) {
        let helperType = isStyleIfHelper(statement);

        // If this is a `{{style-if}}` or `{{style-unless}}` helper:
        if ( helperType ) {
          let condition = statement.params[0];
          let whenTrue: Array<StateParent> | undefined = undefined;
          let whenFalse: Array<StateParent> | undefined = undefined;
          let mainBranch = statement.params[1];
          let elseBranch = statement.params[2];

          // Calculate the classes in the main branch of the style helper
          if (isStringLiteral(mainBranch)) {
            let containers = this.lookupClasses(mainBranch.value, mainBranch);
            if (helperType === "style-if") {
              whenTrue = containers;
            } else {
              whenFalse = containers;
            }
          } else {
            throw cssBlockError(`{{${helperType}}} expects a string literal as its second argument.`, mainBranch, this.template);
          }

          // Calculate the classes in the else branch of the style helper, if it exists.
          if (elseBranch) {
            if (isStringLiteral(elseBranch)) {
              let containers = this.lookupClasses(elseBranch.value, elseBranch);
              if (helperType === "style-if") {
                whenFalse = containers;
              } else {
                whenTrue = containers;
              }
            } else {
              throw cssBlockError(`{{${helperType}}} expects a string literal as its third argument.`, elseBranch, this.template);
            }
          }
          if (analysis.storeConditionals) {
            analysis.element.addDynamicClasses(dynamicClasses(condition, whenTrue, whenFalse));
          } else {
            analysis.element.addDynamicClasses(dynamicClasses(null, whenTrue, whenFalse));
          }

        } else {
          throw cssBlockError(`Only {{style-if}} or {{style-unless}} helpers are allowed in class attributes.`, node, this.template);
        }
      } else {
        assertNever(statement);
      }
    }
  }

  /**
   * Adds states to the current node.
   */
  private processState(
    blockName: string | undefined,
    stateName: string,
    node: AST.AttrNode,
    analysis: RewriteAnalysis
  ): void {
    let stateBlock = blockName ? this.block.getReferencedBlock(blockName) : this.block;
    if (stateBlock === null) {
      throw cssBlockError(`No block named ${blockName} referenced from ${this.debugBlockPath()}`, node, this.template);
    }
    let containers = analysis.element.classesForBlock(stateBlock);
    if (containers.length === 0) {
      throw cssBlockError(`No block or class from ${blockName || "the default block"} is assigned to the element so a state from that block cannot be used.`, node, this.template);
    }
    let staticSubStateName: string | undefined = undefined;
    let dynamicSubState: AST.MustacheStatement | AST.ConcatStatement | undefined = undefined;
    if (isTextNode(node.value)) {
      staticSubStateName = node.value.chars;
      if (staticSubStateName === "") {
        staticSubStateName = undefined;
      }
    } else {
      dynamicSubState = node.value;
    }
    for (let container of containers) {
      let allStates = container.states.resolveGroup(stateName, staticSubStateName);
      if (allStates) {
        // TODO: fix the tsd for object.values so it gets the type right.
        let states = objectValues(allStates);
        if (states[0].group) {
          if (dynamicSubState) {
            if (analysis.storeConditionals) {
              analysis.element.addDynamicGroup(container, allStates, dynamicSubState);
            } else {
              analysis.element.addDynamicGroup(container, allStates, null);
            }
          } else if (states.length === 1 && staticSubStateName) {
            analysis.element.addStaticState(container, states[0]);
          } else {
            throw cssBlockError(`No expression found to select from ${states.map(s => s.asSource()).join(', ')} on ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
          }
        } else {
          if (states.length !== 1) {
            throw new Error("internal error, please file a bug.");
          }
          if (dynamicSubState) {
            if (dynamicSubState.type === "ConcatStatement") {
              throw cssBlockError(`The dynamic statement for a boolean state must be set to a mustache statement with no additional text surrounding it.`, dynamicSubState, this.template);
            }
            if (analysis.storeConditionals) {
              let expr: AST.Expression;
              let {path, params, hash} = dynamicSubState;
              if (path.type === "PathExpression") {
                expr = builders.sexpr(path, params, hash);
              } else {
                if (params.length > 0) {
                  throw cssBlockError(`Unsure how to handle this node.`, dynamicSubState, this.template);
                }
                expr = path;
              }
              analysis.element.addDynamicState(container, states[0], expr);
            } else {
              analysis.element.addDynamicState(container, states[0], null);
            }
          } else {
            analysis.element.addStaticState(container, states[0]);
          }
        }
      } else {
        if (staticSubStateName) {
          throw cssBlockError(`No state found named ${stateName} with a sub-state of ${staticSubStateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
        } else {
          throw cssBlockError(`No state(s) found named ${stateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
        }
      }
    }
  }
}

function isStringLiteral(value: AST.Node | undefined): value is AST.StringLiteral {
  return value !== undefined && value.type === "StringLiteral";
}
function isConcatStatement(value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement): value is AST.ConcatStatement {
  return value.type === 'ConcatStatement';
}
function isTextNode(value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement): value is AST.TextNode {
  return value.type === 'TextNode';
}
function isMustacheStatement(value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement): value is AST.MustacheStatement {
  return value.type === 'MustacheStatement';
}

function isStyleIfHelper( node: AST.MustacheStatement ): "style-if" | "style-unless" | undefined {
  if ( node.path.type !== 'PathExpression' ) { return undefined; }
  let parts: string[] = (<AST.PathExpression>node.path).parts;
  if (parts.length > 0) {
    let name = parts[0];
    if (name === STYLE_IF || name === STYLE_UNLESS) {
      return name;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

function nodeLocation(node: AST.Node): SourceLocation {
  let start: SourcePosition = {
    filename: node.loc.source || undefined,
    line: node.loc.start.line,
    column: node.loc.start.column,
  };
  let end: SourcePosition = {
    filename: node.loc.source || undefined,
    line: node.loc.start.line,
    column: node.loc.start.column,
  };
  return { start, end };
}

type BranchStyles = Array<StateParent> | undefined;

function dynamicClasses( condition: null, whenTrue: BranchStyles, whenFalse: BranchStyles,): DynamicClasses<null>;
function dynamicClasses( condition: AST.Expression, whenTrue: BranchStyles, whenFalse: BranchStyles,): DynamicClasses<TernaryExpression>;
function dynamicClasses( condition: AST.Expression | null, whenTrue: BranchStyles, whenFalse: BranchStyles,): DynamicClasses<TernaryExpression | null> {
  if (whenTrue && whenFalse) {
    return { condition, whenTrue, whenFalse };
  } else if (whenTrue) {
    return { condition, whenTrue };
  } else if (whenFalse) {
    return { condition, whenFalse };
  } else {
    throw new Error('sometimes type checkers are dumb');
  }
}