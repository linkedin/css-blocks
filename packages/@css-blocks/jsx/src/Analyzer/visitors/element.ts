import { Analysis, Block, ElementAnalysis } from "@css-blocks/core";
import {
  SourceLocation as TemplateSourceLocation,
  SourcePosition as TemplateSourcePosition,
} from "@opticss/element-analysis";
import { Binding, NodePath } from "babel-traverse";
import {
  AssignmentExpression,
  CallExpression,
  Expression,
  Identifier,
  JSXAttribute,
  JSXOpeningElement,
  Node,
  SourceLocation,
  isCallExpression,
  isIdentifier,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isMemberExpression,
  isVariableDeclarator,
} from "babel-types";

import { isCommonNameForStyling, isStyleFunction } from "../../styleFunctions";
import { MalformedBlockPath, TemplateAnalysisError } from "../../utils/Errors";
import { ExpressionReader, isBlockStateGroupResult, isBlockStateResult } from "../../utils/ExpressionReader";
import { isConsoleLogStatement } from "../../utils/isConsoleLogStatement";
import { JSXAnalysis } from "../index";
import { TEMPLATE_TYPE } from "../Template";
import { BooleanExpression, Flags, JSXElementAnalysis, StringExpression, TernaryExpression } from "../types";

function htmlTagName(el: JSXOpeningElement): string | undefined { return (isJSXIdentifier(el.name) && el.name.name === el.name.name.toLowerCase()) ? el.name.name : undefined; }
function isLocation(n: object): n is SourceLocation { return !!((<SourceLocation>n).start && (<SourceLocation>n).end && typeof (<SourceLocation>n).start.line === "number"); }
function isNodePath(n: object): n is NodePath { return !!(<NodePath>n).node; }

export class JSXElementAnalyzer {
  private analysis: JSXAnalysis;
  private filename: string;
  private classProperties: Flags;
  private isRewriteMode: boolean;
  reservedClassNames: Set<string>;

  constructor(analysis: JSXAnalysis, isRewriteMode = false) {
    this.analysis = analysis;
    this.isRewriteMode = isRewriteMode;
    this.filename = analysis.template.identifier;
    this.classProperties = {
      class: true,
      className: true,
    };
    this.reservedClassNames = analysis.reservedClassNames();
  }

  private startElement(location: TemplateSourceLocation, tagName?: string): JSXElementAnalysis {
    if (this.isRewriteMode) { return new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(location, this.reservedClassNames, tagName); }
    return this.analysis.startElement<BooleanExpression, StringExpression, TernaryExpression>(location, tagName);
  }

  private endElement(element: JSXElementAnalysis) {
    if (this.isRewriteMode) { return; }
    return this.analysis.endElement<BooleanExpression, StringExpression, TernaryExpression>(element);
  }

  private isClassAttribute(attr: JSXAttribute): boolean {
    return isJSXIdentifier(attr.name) && this.classProperties[attr.name.name];
  }

  classAttributePaths(path: NodePath<JSXOpeningElement>): Array<NodePath<JSXAttribute>> {
    let attrPath = path.get("attributes.0") as NodePath<JSXAttribute> | undefined;
    let found = new Array<NodePath<JSXAttribute>>();
    while (attrPath && attrPath.node) {
      if (this.isClassAttribute(attrPath.node)) { found.push(attrPath); }
      // Any because the type def is incomplete
      // tslint:disable-next-line:prefer-unknown-to-any
      attrPath = (<any>attrPath).getNextSibling() as NodePath<JSXAttribute> | undefined;
    }
    return found;
  }

  analyzeAssignment(path: NodePath<AssignmentExpression>): JSXElementAnalysis | undefined {
    let assignment = path.node;
    if (assignment.operator !== "=") return;
    let lVal = assignment.left;
    let element: JSXElementAnalysis | undefined;
    if (isMemberExpression(lVal)) {
      let property = lVal.property;
      if (!lVal.computed && isIdentifier(property) && property.name === "className") {
        element = this.startElement(this.location(path));
        this.analyzeClassExpression(path.get("right"), element);
        this.endElement(element);
      }
    }
    return element;
  }

  analyzeJSXElement(path: NodePath<JSXOpeningElement>): JSXElementAnalysis | undefined {
    let el = path.node;

    // We don't care about elements with no attributes;
    if (!el.attributes || el.attributes.length === 0) { return; }

    let classAttrs = this.classAttributePaths(path);
    // If/When we add state attributes, we should throw an error if those are set before exiting.
    if (classAttrs.length === 0) return;

    let element = this.startElement(this.location(path), htmlTagName(el));

    for (let classAttr of classAttrs) { this.analyzeClassAttribute(classAttr, element); }

    // TODO: implement state attributes when it is supported.

    this.endElement(element);

    return element;
  }

  private location(loc: SourceLocation | Node | NodePath<Node>): TemplateSourceLocation {
    if (isNodePath(loc)) {
      loc = loc.node.loc;
    } else if (!isLocation(loc)) {
      loc = loc.loc;
    }
    let location: TemplateSourceLocation = {
      start: { ...loc.start },
      end: { ...loc.end },
    };
    location.start.filename = this.filename;
    location.end!.filename = this.filename;
    return location;
  }

  private nodeLoc(node: Node | NodePath<Node>): TemplateSourcePosition {
    return this.location(node).start;
  }

  styleVariableBinding(path: NodePath<JSXAttribute>): Binding | undefined {
    let valuePath = path.get("value");
    if (!valuePath.node || !isJSXExpressionContainer(valuePath.node)) return; // should this be an error?
    if (isIdentifier(valuePath.node.expression)) {
      let identPath = valuePath.get("expression") as NodePath<Identifier>;
      let identBinding = path.scope.getBinding(identPath.node.name);
      if (identBinding && identBinding.kind === "module" || !identBinding) {
        return;
      }
      if (isVariableDeclarator(identBinding.path.node)) {
        return identBinding;
      }
    }
    return;
  }

  private analyzeClassExpression(expression: NodePath<Expression>, element: JSXElementAnalysis, suppressErrors = false): void {
    if (isIdentifier(expression.node)) {
      let identifier = expression.node;
      let identBinding = expression.scope.getBinding(identifier.name);
      if (identBinding) {
        if (identBinding.constantViolations.length > 0) {
          if (suppressErrors) return;
          throw new TemplateAnalysisError(`illegal assignment to a style variable.`, this.nodeLoc(identBinding.constantViolations[0]));
        }
        if (identBinding.kind === "module") {
          let name = identifier.name;
          // Check if there is a block of this name imported. If so, save style and exit.
          let block: Block | undefined = this.analysis.getBlock(name);
          if (block) {
            element.addStaticClass(block.rootClass);
          } else {
            if (suppressErrors) return;
            throw new TemplateAnalysisError(`No block named ${name} was found`, this.nodeLoc(expression));
          }
        } else {
          let identPathNode = identBinding.path.node;
          let initialValueOfIdent: Expression;
          if (isVariableDeclarator(identPathNode)) {
            initialValueOfIdent = identPathNode.init;
            if (identBinding.references > 1) {
              for (let refPath of identBinding.referencePaths.filter(p => p.parentPath.type !== "JSXExpressionContainer")) {
                let parentPath = refPath.parentPath;
                if (!isConsoleLogStatement(parentPath.node)) {
                  if (suppressErrors) return;
                  throw new TemplateAnalysisError(`illegal use of a style variable.`, this.nodeLoc(parentPath));
                }
              }
            }
          } else {
            if (suppressErrors) return;
            throw new TemplateAnalysisError(`variable for class attributes must be initialized with a style expression.`, this.nodeLoc(expression));
          }
          this.addPossibleDynamicStyles(element, initialValueOfIdent, identBinding.path);
        }
      }
    } else if (expression.isMemberExpression()) {
      // Discover direct references to an imported block.
      // Ex: `blockName.foo` || `blockName['bar']` || `blockName.bar()`
      let parts: ExpressionReader = new ExpressionReader(expression.node, this.filename);
      let expressionResult = parts.getResult(this.analysis);
      let blockClass = expressionResult.blockClass;
      if (isBlockStateGroupResult(expressionResult) || isBlockStateResult(expressionResult)) {
        throw new Error("internal error, not expected on a member expression");
      } else {
        element.addStaticClass(blockClass);
      }
    } else if (isCallExpression(expression.node)) {
      let callExpr = expression.node;
      let styleFn = isStyleFunction(expression, callExpr);
      if (styleFn.type === "error") {
        if (styleFn.canIgnore) {
          // It's not a style helper function, assume it's a static reference to a state.
          try {
            let parts: ExpressionReader = new ExpressionReader(callExpr, this.filename);
            let expressionResult = parts.getResult(this.analysis);
            let blockClass = expressionResult.blockClass;
            if (isBlockStateGroupResult(expressionResult)) {
              element.addDynamicGroup(blockClass, expressionResult.stateGroup, expressionResult.dynamicStateExpression, false);
            } else if (isBlockStateResult(expressionResult)) {
              element.addStaticAttr(blockClass, expressionResult.state);
            } else {
              throw new Error("internal error, not expected on a call expression");
            }
          } catch (e) {
            if (e instanceof MalformedBlockPath) {
              if (isIdentifier(callExpr.callee)) {
                let fnName = callExpr.callee.name;
                if (isCommonNameForStyling(fnName)) {
                  throw new TemplateAnalysisError(`The call to style function '${fnName}' does not resolve to an import statement of a known style helper.`, this.nodeLoc(expression));
                } else {
                  throw new TemplateAnalysisError(`Function called within class attribute value '${fnName}' must be either an 'objstr' call, or a state reference`, this.nodeLoc(expression));
                }
              }
            }
            throw e;
          }
        } else {
          if (suppressErrors) return;
          throw new TemplateAnalysisError(styleFn.message, styleFn.location);
        }
      } else {
        styleFn.analyze(this.analysis, element, this.filename, styleFn, callExpr);
      }
    } else {
      // TODO handle ternary expressions like style-if in handlebars?
    }
  }

  private analyzeClassAttribute(path: NodePath<JSXAttribute>, element: JSXElementAnalysis): void {
    let value = path.get("value");
    if (!value.isJSXExpressionContainer()) return; // should this be an error?
    // If this attribute's value is an expression, evaluate it for block references.
    // Discover block root identifiers.
    let expressionPath = value.get("expression");
    this.analyzeClassExpression(expressionPath, element);
  }

  /**
   * Given a well formed style expression `CallExpression`, add all Block style references
   * to the given analysis object.
   * @param analysis This template's analysis object.
   * @param path The objstr CallExpression Path.
   */
  private addPossibleDynamicStyles(element: JSXElementAnalysis, expression: Expression, path: NodePath<Node>) {

    // If this node is not a call expression (ex: `objstr({})`), or is a complex
    // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
    // short circuit and continue execution.
    if (!isCallExpression(expression)) {
      return;
    }
    let func: CallExpression = expression;

    // If this call expression is not an `objstr` call, or is in a form we don't
    // recognize (Ex: first arg is not an object), short circuit and continue execution.
    let styleFunc = isStyleFunction(path, expression);
    if (styleFunc.type === "error") {
      if (styleFunc.canIgnore) {
        return;
      } else {
        throw new TemplateAnalysisError(styleFunc.message, { filename: this.filename, ...styleFunc.location });
      }
    }
    styleFunc.analyze(this.analysis, element, this.filename, styleFunc, func);
  }
}

/**
 * Babel visitors we can pass to `babel-traverse` to run analysis on a given JSX file.
 * @param analysis The Analysis object to store our results in.
 */
export function elementVisitor(analysis: Analysis<TEMPLATE_TYPE>): object {
  let elementAnalyzer = new JSXElementAnalyzer(analysis);

  return {
    AssignmentExpression(path: NodePath<AssignmentExpression>): void {
      elementAnalyzer.analyzeAssignment(path);
    },
    //  TODO: handle the `h()` function?

    /**
     * Primary analytics parser for Babylon. Crawls all JSX Elements and their attributes
     * and saves all discovered block references. See README for valid JSX CSS Block APIs.
     * @param path The JSXOpeningElement Babylon path we are processing.
     */
    JSXOpeningElement(path: NodePath<JSXOpeningElement>): void {
      elementAnalyzer.analyzeJSXElement(path);
    },
  };
}
