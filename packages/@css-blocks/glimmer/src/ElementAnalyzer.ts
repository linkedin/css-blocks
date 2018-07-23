import { AttrValue, Block, BlockClass, DynamicClasses, ElementAnalysis, ResolvedConfiguration as CSSBlocksConfiguration } from "@css-blocks/core";
import { AST, print } from "@glimmer/syntax";
import { SourceLocation, SourcePosition } from "@opticss/element-analysis";
import { assertNever } from "@opticss/util";
import * as debugGenerator from "debug";

import { GlimmerAnalysis } from "./Analyzer";
import { ResolvedFile } from "./Template";
import { cssBlockError } from "./utils";

export type TernaryExpression = AST.Expression;
export type StringExpression = AST.MustacheStatement | AST.ConcatStatement;
export type BooleanExpression = AST.Expression | AST.MustacheStatement;
export type TemplateElement  = ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>;
export type AnalysisElement  = ElementAnalysis<null, null, null>;

type RewriteAnalysis = {
  element: TemplateElement;
  storeConditionals: true;
} | {
  element: AnalysisElement;
  storeConditionals: false;
};

// TODO: The state namespace should come from a config option.
const STATE = /^state:(?:([^.]+)\.)?([^.]+)$/;
const STYLE_IF = "style-if";
const STYLE_UNLESS = "style-unless";

const debug = debugGenerator("css-blocks:glimmer:element-analyzer");

export class ElementAnalyzer {
  analysis: GlimmerAnalysis;
  block: Block;
  template: ResolvedFile;
  cssBlocksOpts: CSSBlocksConfiguration;

  constructor(analysis: GlimmerAnalysis, cssBlocksOpts: CSSBlocksConfiguration) {
    this.analysis = analysis;
    this.block = analysis.getBlock("")!; // Local block check done elsewhere
    this.template = analysis.template;
    this.cssBlocksOpts = cssBlocksOpts;
  }
  analyze(node: AST.ElementNode, atRootElement: boolean): AnalysisElement {
    let element = this.analysis.startElement<null, null, null>(nodeLocation(node), node.tag);
    this._analyze(node, atRootElement, {element, storeConditionals: false});
    this.analysis.endElement(element);
    return element;
  }
  analyzeForRewrite(node: AST.ElementNode, atRootElement: boolean): TemplateElement {
    let element = new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(nodeLocation(node), node.tag);
    this._analyze(node, atRootElement, {element, storeConditionals: true});
    return element;
  }

  // tslint:disable-next-line:prefer-whatever-to-any
  private debugAnalysis(node: AST.ElementNode, atRootElement: boolean, element: ElementAnalysis<any, any, any>) {
    if (!debug.enabled) return;
    let startTag = `<${node.tag} ${node.attributes.map(a => print(a)).join(" ")}>`;
    debug(`Element ${startTag} is ${atRootElement ? "the root " : "a sub"}element at ${this.debugTemplateLocation(node)}`);
    debug(`↳ Analyzed as: ${element.forOptimizer(this.cssBlocksOpts)[0].toString()}`);
  }

  private debugTemplateLocation(node: AST.ElementNode) {
    let templatePath = this.cssBlocksOpts.importer.debugIdentifier(this.template.identifier, this.cssBlocksOpts);
    return `${templatePath}:${node.loc.start.line}:${node.loc.start.column}`;
  }
  private debugBlockPath() {
    return this.cssBlocksOpts.importer.debugIdentifier(this.block.identifier, this.cssBlocksOpts);
  }

  private _analyze(
    node: AST.ElementNode,
    atRootElement: boolean,
    analysis: RewriteAnalysis,
  ) {

    // The root element gets the block's root class automatically.
    if (atRootElement) {
      analysis.element.addStaticClass(this.block.rootClass);
    }

    // Find the class attribute and process.
    let classAttr: AST.AttrNode | undefined =
      node.attributes.find(n => n.name === "class");

    if (classAttr) this.processClass(classAttr, analysis);

    for (let attribute of node.attributes) {
      if (!STATE.test(attribute.name)) continue;
      this.processState(RegExp.$1, RegExp.$2, attribute, analysis);
    }

    analysis.element.seal();
    this.debugAnalysis(node, atRootElement, analysis.element);
    return;
  }

  private lookupClasses(classes: string, node: AST.Node): Array<BlockClass> {
    let classNames = classes.trim().split(/\s+/);
    let found = new Array<BlockClass>();
    for (let name of classNames) {
      found.push(this.lookupClass(name, node));
    }
    return found;
  }

  private lookupClass(name: string, node: AST.Node): BlockClass {
    let found = this.block.lookup(name);
    if (!found && !/\./.test(name)) {
      found = this.block.lookup("." + name);
    }
    if (found) {
      return <BlockClass>found;
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
        if (helperType) {
          let condition = statement.params[0];
          let whenTrue: Array<BlockClass> | undefined = undefined;
          let whenFalse: Array<BlockClass> | undefined = undefined;
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
    analysis: RewriteAnalysis,
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
      let stateGroup = container.resolveAttribute({
        namespace: "state",
        name: stateName,
      });

      let state: AttrValue | null | undefined = undefined;
      if (stateGroup && staticSubStateName) {
        state = stateGroup.resolveValue(staticSubStateName);
        if (state) {
          analysis.element.addStaticAttr(container, state);
        } else {
          throw cssBlockError(`No sub-state found named ${staticSubStateName} in state ${stateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
        }
      } else if (stateGroup) {
        if (stateGroup.hasResolvedValues()) {
          if (dynamicSubState) {
            if (analysis.storeConditionals) {
              analysis.element.addDynamicGroup(container, stateGroup, dynamicSubState);
            } else {
              analysis.element.addDynamicGroup(container, stateGroup, null);
            }
          } else {
            // TODO: when we add default sub states this is where that will go.
            throw cssBlockError(`No sub-state specified for ${stateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
          }
        } else {
          if (dynamicSubState) {
            if (dynamicSubState.type === "ConcatStatement") {
              throw cssBlockError(`The dynamic statement for a boolean state must be set to a mustache statement with no additional text surrounding it.`, dynamicSubState, this.template);
            }
            let state = stateGroup.presenceRule;
            if (analysis.storeConditionals) {
              analysis.element.addDynamicAttr(container, state!, dynamicSubState);
            } else {
              analysis.element.addDynamicAttr(container,  state!, null);
            }
          } else {
            analysis.element.addStaticAttr(container, stateGroup.presenceRule!);
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
  return value.type === "ConcatStatement";
}
function isTextNode(value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement): value is AST.TextNode {
  return value.type === "TextNode";
}
function isMustacheStatement(value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement): value is AST.MustacheStatement {
  return value.type === "MustacheStatement";
}

function isStyleIfHelper(node: AST.MustacheStatement): "style-if" | "style-unless" | undefined {
  if (node.path.type !== "PathExpression") { return undefined; }
  let parts: string[] = (node.path).parts;
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

type BranchStyles = Array<BlockClass> | undefined;

function dynamicClasses(condition: null, whenTrue: BranchStyles, whenFalse: BranchStyles): DynamicClasses<null>;
function dynamicClasses(condition: AST.Expression, whenTrue: BranchStyles, whenFalse: BranchStyles): DynamicClasses<TernaryExpression>;
function dynamicClasses(condition: AST.Expression | null, whenTrue: BranchStyles, whenFalse: BranchStyles): DynamicClasses<TernaryExpression | null> {
  if (whenTrue && whenFalse) {
    return { condition, whenTrue, whenFalse };
  } else if (whenTrue) {
    return { condition, whenTrue };
  } else if (whenFalse) {
    return { condition, whenFalse };
  } else {
    throw new Error("sometimes type checkers are dumb");
  }
}
