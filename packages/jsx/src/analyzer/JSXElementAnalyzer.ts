import {
  SourceLocation as TemplateSourceLocation,
  SourcePosition as TemplateSourcePosition,
} from '@opticss/element-analysis';
import { ObjectDictionary } from '@opticss/util';
import { Binding, NodePath } from 'babel-traverse';
import {
  AssignmentExpression,
  CallExpression,
  Expression,
  Identifier,
  isCallExpression,
  isIdentifier,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isMemberExpression,
  isVariableDeclarator,
  JSXAttribute,
  JSXOpeningElement,
  Node,
  SourceLocation,
} from 'babel-types';
import { Block } from 'css-blocks';

import { isCommonNameForStyling, isStyleFunction } from '../styleFunctions';
import { MalformedBlockPath, TemplateAnalysisError } from '../utils/Errors';
import { ExpressionReader, isBlockStateGroupResult, isBlockStateResult } from '../utils/ExpressionReader';
import { isConsoleLogStatement } from '../utils/isConsoleLogStatement';

import { Flags, JSXElementAnalysis, newJSXElementAnalysis } from './types';

export class JSXElementAnalyzer {
  private filename: string;
  private classProperties: Flags;
  private blocks: ObjectDictionary<Block>;

  constructor(blocks: ObjectDictionary<Block>, filename: string) {
    this.blocks = blocks;
    this.filename = filename;
    this.classProperties = {
      class: true,
      className: true,
    };
  }

  isClassAttribute(attr: JSXAttribute): boolean {
    return isJSXIdentifier(attr.name) && this.classProperties[attr.name.name];
  }

  classAttributePaths(path: NodePath<JSXOpeningElement>): Array<NodePath<JSXAttribute>> {
    let attrPath = path.get('attributes.0') as NodePath<JSXAttribute> | undefined;
    let found = new Array<NodePath<JSXAttribute>>();
    while (attrPath && attrPath.node) {
      if (this.isClassAttribute(attrPath.node)) {
        found.push(attrPath);
      }
      // Any because the type def is incomplete
      // tslint:disable-next-line:prefer-whatever-to-any
      attrPath = (<any>attrPath).getNextSibling() as NodePath<JSXAttribute> | undefined;
    }
    return found;
  }

  analyzeAssignment(path: NodePath<AssignmentExpression>): JSXElementAnalysis | undefined {
    let assignment = path.node;
    if (assignment.operator !== '=') return;
    let lVal = assignment.left;
    if (isMemberExpression(lVal)) {
      let property = lVal.property;
      if (!lVal.computed && isIdentifier(property) && property.name === 'className') {
        let element = newJSXElementAnalysis(this.location(path));
        this.analyzeClassExpression(path.get('right') as NodePath<Expression>, element);
        if (element.hasStyles()) {
          return element;
        }
      }
    }
    return;
  }

  analyzeJSXElement(path: NodePath<JSXOpeningElement>): JSXElementAnalysis | undefined {
    let el = path.node;

    // We don't care about elements with no attributes;
    if (!el.attributes || el.attributes.length === 0) {
      return;
    }

    let classAttrs = this.classAttributePaths(path);
    // If/When we add state attributes, we should throw an error if those are set before exiting.
    if (classAttrs.length === 0) return;

    let element = newJSXElementAnalysis(this.location(path), htmlTagName(el));

    for (let classAttr of classAttrs) {
      this.analyzeClassAttribute(classAttr, element);
    }

    // el.attributes.forEach((attr: JSXAttribute) => {
    // TODO: implement state attributes when it is supported.
    // Look up (optionally block-scoped) states against the state containers found in the class attribute.
    // add them here accordingly.
    // });

    return element;
  }

  private location(loc: SourceLocation | Node | NodePath<Node>): TemplateSourceLocation {
    if (isNodePath(loc)) {
      loc = loc.node.loc;
    } else if (!isLocation(loc)) {
      loc = loc.loc;
    }
    let location: TemplateSourceLocation = {
      start: {...loc.start},
      end: {...loc.end},
    };
    location.start.filename = this.filename;
    location.end!.filename = this.filename;
    return location;
  }

  private nodeLoc(node: Node | NodePath<Node>): TemplateSourcePosition {
    return this.location(node).start;
  }

  styleVariableBinding(path: NodePath<JSXAttribute>): Binding | undefined {
    let valuePath = path.get('value');
    if (!isJSXExpressionContainer(valuePath.node)) return; // should this be an error?
    if (isIdentifier(valuePath.node.expression)) {
      let identPath = valuePath.get('expression') as NodePath<Identifier>;
      let identBinding = path.scope.getBinding(identPath.node.name);
      if (identBinding && identBinding.kind === 'module' || !identBinding) {
        return;
      }
      if (isVariableDeclarator(identBinding.path.node)) {
        return identBinding;
      }
    }
    return;
  }

  private analyzeClassExpression(expression: NodePath<Expression>, element: JSXElementAnalysis, suppressErrors = false): void {
    if (expression.isIdentifier()) {
      let identifier = expression.node as Identifier;
      let identBinding = expression.scope.getBinding(identifier.name);
      if (identBinding) {
        if (identBinding.constantViolations.length > 0) {
          if (suppressErrors) return;
          throw new TemplateAnalysisError(`illegal assignment to a style variable.`, this.nodeLoc(identBinding.constantViolations[0]));
        }
        if (identBinding.kind === 'module') {
          let name = identifier.name;
          // Check if there is a block of this name imported. If so, save style and exit.
          let block: Block | undefined = this.blocks[name];
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
              for (let refPath of identBinding.referencePaths.filter(p => p.parentPath.type !== 'JSXExpressionContainer')) {
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
      let expressionResult = parts.getResult(this.blocks);
      let blockClass = expressionResult.blockClass;
      if (isBlockStateGroupResult(expressionResult) || isBlockStateResult(expressionResult)) {
        throw new Error('internal error, not expected on a member expression');
      } else {
        element.addStaticClass(blockClass);
      }
    } else if (expression.isCallExpression()) {
      let callExpr = expression.node as CallExpression;
      let styleFn = isStyleFunction(expression, callExpr);
      if (styleFn.type === 'error') {
        if (styleFn.canIgnore) {
          // It's not a style helper function, assume it's a static reference to a state.
          try {
            let parts: ExpressionReader = new ExpressionReader(callExpr, this.filename);
            let expressionResult = parts.getResult(this.blocks);
            let blockClass = expressionResult.blockClass;
            if (isBlockStateGroupResult(expressionResult)) {
              element.addDynamicGroup(blockClass, expressionResult.stateGroup, expressionResult.dynamicStateExpression, false);
            } else if (isBlockStateResult(expressionResult)) {
              element.addStaticState(blockClass, expressionResult.state);
            } else {
              throw new Error('internal error, not expected on a call expression');
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
        styleFn.analyze(this.blocks, element, this.filename, styleFn, callExpr);
      }
    } else {
      // TODO handle ternary expressions like style-if in handlebars?
    }
  }

  private analyzeClassAttribute(path: NodePath<JSXAttribute>, element: JSXElementAnalysis): void {
    let value = path.get('value');
    if (!value.isJSXExpressionContainer()) return; // should this be an error?
    // If this attribute's value is an expression, evaluate it for block references.
    // Discover block root identifiers.
    let expressionPath = value.get('expression') as NodePath<Expression>;
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
    if (styleFunc.type === 'error') {
      if (styleFunc.canIgnore) {
        return;
      } else {
        throw new TemplateAnalysisError(styleFunc.message, { filename: this.filename, ...styleFunc.location });
      }
    }
    styleFunc.analyze(this.blocks, element, this.filename, styleFunc, func);
  }
}

function htmlTagName(el: JSXOpeningElement): string | undefined {
  if (isJSXIdentifier(el.name) && el.name.name === el.name.name.toLowerCase()) {
    return el.name.name;
  }
  return;
}

function isLocation(n: object): n is SourceLocation {
  if ((<SourceLocation>n).start && (<SourceLocation>n).end && typeof (<SourceLocation>n).start.line === 'number') {
    return true;
  } else {
    return false;
  }
}
function isNodePath(n: object): n is NodePath {
  if ((<NodePath>n).node) {
    return true;
  } else {
    return false;
  }
}
