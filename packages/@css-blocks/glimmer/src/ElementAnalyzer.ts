import {
  AttrValue,
  Block,
  BlockClass,
  ElementAnalysis,
  ResolvedConfiguration as CSSBlocksConfiguration,
  charInFile,
  isNamespaceReserved,
} from "@css-blocks/core";
import { AST, print } from "@glimmer/syntax";
import { SourceLocation, SourcePosition } from "@opticss/element-analysis";
import { assertNever } from "@opticss/util";
import * as debugGenerator from "debug";

import { GlimmerAnalysis } from "./Analyzer";
import { getEmberBuiltInStates, isEmberBuiltIn } from "./EmberBuiltins";
import { ResolvedFile } from "./Template";
import {
  cssBlockError,
  isBooleanLiteral,
  isConcatStatement,
  isElementNode,
  isMustacheStatement,
  isNullLiteral,
  isNumberLiteral,
  isPathExpression,
  isStringLiteral,
  isSubExpression,
  isTextNode,
  isUndefinedLiteral,
} from "./utils";

// Expressions may be null when ElementAnalyzer is used in the second pass analysis
// to re-acquire analysis data for rewrites without storing AST nodes.
export type TernaryExpression = AST.Expression | AST.MustacheStatement | null;
export type StringExpression = AST.MustacheStatement | AST.ConcatStatement | AST.SubExpression | AST.PathExpression | null;
export type BooleanExpression = AST.Expression | AST.MustacheStatement;
export type TemplateElement  = ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>;
export type AttrRewriteMap = { [key: string]: TemplateElement };

const NAMESPACED_ATTR = /^([^:]+):([^:]+)$/;
const STYLE_IF = "style-if";
const STYLE_UNLESS = "style-unless";
const DEFAULT_BLOCK_NAME = "default";
const DEFAULT_BLOCK_NS = "block";

const debug = debugGenerator("css-blocks:glimmer:element-analyzer");

type AnalyzableNode = AST.ElementNode | AST.BlockStatement | AST.MustacheStatement | AST.SubExpression;

export function isStyleOfHelper(node: AnalyzableNode): node is AST.MustacheStatement | AST.SubExpression {
  if (!isMustacheStatement(node)) return false;
  let name = node.path.original;
  return typeof name === "string" && name === "style-of";
}

export function isAnalyzedHelper(node: AnalyzableNode): node is AST.MustacheStatement | AST.BlockStatement {
  if (isElementNode(node)) return false;
  return isEmberBuiltIn(node.path.original) || isStyleOfHelper(node);
}

export class ElementAnalyzer {
  analysis: GlimmerAnalysis;
  block: Block;
  template: ResolvedFile;
  cssBlocksOpts: CSSBlocksConfiguration;
  reservedClassNames: Set<string>;

  constructor(analysis: GlimmerAnalysis, cssBlocksOpts: CSSBlocksConfiguration) {
    this.analysis = analysis;
    this.block = analysis.getBlock(DEFAULT_BLOCK_NAME)!; // Local block check done elsewhere
    this.template = analysis.template;
    this.cssBlocksOpts = cssBlocksOpts;
    this.reservedClassNames = analysis.reservedClassNames();
  }

  analyze(node: AnalyzableNode, atRootElement: boolean): AttrRewriteMap {
    return this._analyze(node, atRootElement, false);
  }

  analyzeForRewrite(node: AnalyzableNode, atRootElement: boolean): AttrRewriteMap {
    return this._analyze(node, atRootElement, true);
  }

  private debugAnalysis(node: AnalyzableNode, atRootElement: boolean, element: TemplateElement) {
    if (!debug.enabled) return;
    let startTag = "";
    if (isElementNode(node)) {
      startTag = `<${node.tag} ${node.attributes.map(a => print(a)).join(" ")}>`;
      debug(`Element ${startTag} is ${atRootElement ? "the root " : "a sub"}element at ${this.debugTemplateLocation(node)}`);
    }
    else {
      startTag = `{{${node.path.original} ${node.params.map(a => print(a)).join(" ")} ${node.hash.pairs.map((h) => print(h)).join(" ")}}}`;
      debug(`Component ${startTag} is ${atRootElement ? "the root " : "a sub"}element at ${this.debugTemplateLocation(node)}`);
    }
    debug(`↳ Analyzed as: ${element.forOptimizer(this.cssBlocksOpts)[0].toString()}`);
  }

  private debugTemplateLocation(node: AnalyzableNode) {
    let templatePath = this.cssBlocksOpts.importer.debugIdentifier(this.template.identifier, this.cssBlocksOpts);
    return charInFile(templatePath, node.loc.start);
  }
  private debugBlockPath(block: Block | null = null) {
    return this.cssBlocksOpts.importer.debugIdentifier((block || this.block).identifier, this.cssBlocksOpts);
  }

  private newElement(node: AnalyzableNode, forRewrite: boolean): TemplateElement {
    let label = isElementNode(node) ? node.tag : node.path.original as string;
    if (forRewrite) {
      return new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(nodeLocation(node), this.reservedClassNames, label);
    }
    else {
      return this.analysis.startElement<BooleanExpression, StringExpression, TernaryExpression>(nodeLocation(node), label);
    }
  }

  private finishElement(element: TemplateElement, forRewrite: boolean): void {
    element.seal();
    if (!forRewrite) { this.analysis.endElement(element); }
  }

  isAttributeAnalyzed(attributeName: string): [string, string] | [null, null] {
    if (NAMESPACED_ATTR.test(attributeName)) {
      let namespace = RegExp.$1;
      let attrName = RegExp.$2;
      if (isNamespaceReserved(namespace)) {
        return [null, null];
      } else {
        return [namespace, attrName];
      }
    } else {
      return [null, null];
    }
  }

  *eachAnalyzedAttribute(node: AnalyzableNode): Iterable<[string, string, AST.AttrNode | AST.HashPair]> {
    if (isElementNode(node)) {
      for (let attribute of node.attributes) {
        let [namespace, attrName] = this.isAttributeAnalyzed(attribute.name);
        if (namespace && attrName) {
          yield [namespace, attrName, attribute];
        }
      }
    } else {
      for (let pair of node.hash.pairs) {
        let [namespace, attrName] = this.isAttributeAnalyzed(pair.key);
        if (namespace && attrName) {
          yield [namespace, attrName, pair];
        }
      }
    }
  }

  private _analyze(
    node: AnalyzableNode,
    atRootElement: boolean,
    forRewrite: boolean,
  ): AttrRewriteMap {

    const attrRewrites = {};
    let element = attrRewrites["class"] = this.newElement(node, forRewrite);

    // The root element gets the block"s root class automatically.
    if (atRootElement) {
      element.addStaticClass(this.block.rootClass);
    }

    // Find the class or scope attribute and process it
    for (let [namespace, attrName, attribute] of this.eachAnalyzedAttribute(node)) {
      if (attrName === "class") {
        this.processClass(namespace, attribute, element, forRewrite);
      } else if (attrName === "scope") {
        this.processScope(namespace, attribute, element, forRewrite);
      }
    }

    // validate that html elements aren't using the class attribute.
    if (isElementNode(node)) {
      for (let attribute of node.attributes) {
        if (attribute.name === "class") {
          throw cssBlockError(`The class attribute is forbidden. Did you mean block:class?`, node, this.template);
        }
      }
    }

    for (let [namespace, attrName, attribute] of this.eachAnalyzedAttribute(node)) {
      if (namespace && attrName) {
        if (attrName === "class" || attrName === "scope") continue;
        this.processState(namespace, attrName, attribute, element, forRewrite);
      }
    }

    this.finishElement(element, forRewrite);

    // If this is an Ember Built-In...
    if (!isElementNode(node) && isEmberBuiltIn(node.path.original)) {
      this.debugAnalysis(node, atRootElement, element);

      // Discover component state style attributes we need to add to the component invocation.
      let klasses = [...element.classesFound()];
      const attrToState = getEmberBuiltInStates(node.path.original);
      for (let attrName of Object.keys(attrToState)) {
        const stateName = attrToState[attrName];
        let element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression> | undefined;
        for (let style of klasses) {
          let attr = style.resolveAttribute(stateName);
          if (!attr || !attr.presenceRule) { continue; }
          if (!element) {
            element = this.newElement(node, forRewrite);
          }
          attrRewrites[attrName] = element; // Only save this element on output if a state is found.
          if (!forRewrite) { element.addStaticClass(style); } // In rewrite mode we only want the states.
          element.addStaticAttr(style, attr.presenceRule);
        }
        if (element) {
          this.finishElement(element, forRewrite);
        }
      }
    }

    this.debugAnalysis(node, atRootElement, element);
    return attrRewrites;
  }

  private lookupClasses(namespace: string, classes: string, node: AST.Node): Array<BlockClass> {
    let classNames = classes.trim().split(/\s+/);
    let found = new Array<BlockClass>();
    for (let name of classNames) {
      found.push(this.lookupClass(namespace, name, node));
    }
    return found;
  }

  private lookupBlock(namespace: string, node: AST.Node): Block {
    let block = (namespace === DEFAULT_BLOCK_NS) ? this.block : this.block.getExportedBlock(namespace);
    if (block === null) {
      throw cssBlockError(`No block '${namespace}' is exported from ${this.debugBlockPath()}`, node, this.template);
    }
    return block;
  }

  private lookupClass(namespace: string, name: string, node: AST.Node): BlockClass {
    let block = this.lookupBlock(namespace, node);
    let found = block.resolveClass(name);
    if (found === null) {
      throw cssBlockError(`No class '${name}' was found in block at ${this.debugBlockPath(block)}`, node, this.template);
    }
    return found;
  }

  /**
   * Adds blocks and block classes to the current node from the class attribute.
   */
  private processClass(namespace: string, node: AST.AttrNode | AST.HashPair, element: TemplateElement, forRewrite: boolean): void {
    let statements: AST.Node[];

    let value = node.value;

    if (isConcatStatement(value)) {
      statements = value.parts;
    } else {
      statements = [node.value];
    }

    for (let statement of statements) {
      if (isTextNode(statement) || isStringLiteral(statement)) {
        let value = isTextNode(statement) ? statement.chars : statement.value;
        for (let container of this.lookupClasses(namespace, value, statement)) {
          element.addStaticClass(container);
        }
      }
      else if (isMustacheStatement(statement) || isSubExpression(statement)) {
        let helperType = isStyleIfHelper(statement);

        // If this is a `{{style-if}}` or `{{style-unless}}` helper:
        if (helperType) {
          let condition = statement.params[0];
          let whenTrue: Array<BlockClass> = [];
          let whenFalse: Array<BlockClass> = [];
          let mainBranch = statement.params[1];
          let elseBranch = statement.params[2];

          // Calculate the classes in the main branch of the style helper
          if (isStringLiteral(mainBranch)) {
            let containers = this.lookupClasses(namespace, mainBranch.value, mainBranch);
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
              let containers = this.lookupClasses(namespace, elseBranch.value, elseBranch);
              if (helperType === "style-if") {
                whenFalse = containers;
              } else {
                whenTrue = containers;
              }
            } else {
              throw cssBlockError(`{{${helperType}}} expects a string literal as its third argument.`, elseBranch, this.template);
            }
          }
          if (forRewrite) {
            element.addDynamicClasses({ condition, whenTrue, whenFalse });
          } else {
            element.addDynamicClasses({ condition: null, whenTrue, whenFalse });
          }

        } else {
          throw cssBlockError(`Only {{style-if}} or {{style-unless}} helpers are allowed in class attributes.`, node, this.template);
        }
      } else {
        throw cssBlockError(`Only string literals, {{style-if}} or {{style-unless}} are allowed in class attributes.`, node, this.template);
      }
    }
  }
  private processScope(namespace: string, node: AST.AttrNode | AST.HashPair, element: TemplateElement, _forRewrite: boolean): void {
    let value = node.value;
    let block = this.lookupBlock(namespace, node);

    if (isTextNode(value)) {
      if (value.chars === "") {
        element.addStaticClass(block.rootClass);
      } else {
        throw cssBlockError("String literal values are not allowed for the scope attribute", node, this.template);
      }
    } else if (isBooleanLiteral(value)) {
      if (value.value) {
        element.addStaticClass(block.rootClass);
      }
    } else if (isMustacheStatement(value) || isSubExpression(value)) {
      // We don't have a way to represent a simple boolean conditional for classes like we do for states.
      // The rewrite might be slightly simpler if we add that.
      element.addDynamicClasses({
        condition: value,
        whenTrue: [block.rootClass],
        whenFalse: [],
      });
    }
  }

  /**
   * Adds states to the current node.
   */
  private processState(
    blockName: string,
    stateName: string,
    node: AST.AttrNode | AST.HashPair,
    element: TemplateElement,
    forRewrite: boolean,
  ): void {
    let stateBlock = this.lookupBlock(blockName, node);
    let containers = element.classesForBlock(stateBlock);
    if (containers.length === 0) {
      throw cssBlockError(`No block or class from ${blockName || "the default block"} is assigned to the element so a state from that block cannot be used.`, node, this.template);
    }
    let staticSubStateName: string | undefined = undefined;
    let dynamicSubState: AST.MustacheStatement | AST.ConcatStatement | AST.SubExpression | AST.PathExpression | undefined = undefined;
    let value = node.value;
    if (isTextNode(value)) {
      staticSubStateName = value.chars;
      if (staticSubStateName === "") {
        staticSubStateName = undefined;
      }
    } else if (isStringLiteral(value)) {
      staticSubStateName = value.value;
      if (staticSubStateName === "") {
        staticSubStateName = undefined;
      }
    } else if (isNumberLiteral(value)) {
      staticSubStateName = value.value.toString();
      if (staticSubStateName === "") {
        staticSubStateName = undefined;
      }
    } else if (isBooleanLiteral(value)) {
      if (!value.value) {
        // Setting the state explicitly to false is the same as not having the state on the element.
        // So we just skip analysis of it. In the future we might want to partially analyze it to validate
        // that the state name exists
        return;
        // Setting it to true is the simplest way to set the state having no substates on an element when using the style-of helper.
      }
    } else if (isMustacheStatement(value) || isConcatStatement(value) || isSubExpression(value) || isPathExpression(value)) {
      dynamicSubState = value;
    } else if (isNullLiteral(value) || isUndefinedLiteral(value)) {
      // Setting the state explicitly to null or undefined is the same as not having the state on the element.
      // So we just skip analysis of it. In the future we might want to partially analyze it to validate
      // that the state name exists
      return;
    } else {
      assertNever(value);
    }

    let found = false;
    const errors: [string, AST.AttrNode | AST.HashPair, ResolvedFile][] = [];
    for (let container of containers) {
      let stateGroup = container.resolveAttribute({
        namespace: "state",
        name: stateName,
      });
      let state: AttrValue | null | undefined = undefined;
      if (stateGroup && staticSubStateName) {
        found = true;
        state = stateGroup.resolveValue(staticSubStateName);
        if (state) {
          element.addStaticAttr(container, state);
        } else {
          throw cssBlockError(`No sub-state found named ${staticSubStateName} in state ${stateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
        }
      } else if (stateGroup) {
        if (stateGroup.hasResolvedValues()) {
          found = true;
          if (dynamicSubState) {
            if (forRewrite) {
              element.addDynamicGroup(container, stateGroup, dynamicSubState);
            } else {
              element.addDynamicGroup(container, stateGroup, null);
            }
          } else {
            // TODO: when we add default sub states this is where that will go.
            throw cssBlockError(`No sub-state specified for ${stateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template);
          }
        } else {
          found = true;
          if (dynamicSubState) {
            if (dynamicSubState.type === "ConcatStatement") {
              throw cssBlockError(`The dynamic statement for a boolean state must be set to a mustache statement with no additional text surrounding it.`, dynamicSubState, this.template);
            }
            let state = stateGroup.presenceRule;
            element.addDynamicAttr(container, state!, dynamicSubState);
          } else {
            element.addStaticAttr(container, stateGroup.presenceRule!);
          }
        }
      }
      else {
        if (staticSubStateName) {
          errors.push([`No state found named ${stateName} with a sub-state of ${staticSubStateName} for ${container.asSource()} in ${blockName || "the default block"}.`, node, this.template]);
        } else {
          errors.push([`No state(s) found named ${stateName} for ${container.asSource()} in ${blockName === "block" && "the default block" || blockName}.`, node, this.template]);
        }
      }
    }
    if (!found) {
      throw cssBlockError(...errors[0]);
    }
  }
}

function isStyleIfHelper(node: AST.MustacheStatement | AST.SubExpression): "style-if" | "style-unless" | undefined {
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
