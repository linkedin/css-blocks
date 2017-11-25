import { Block } from 'css-blocks';
import { ObjectDictionary, } from '@opticss/util';
import {
  SourceLocation as TemplateSourceLocation,
  SourcePosition as TemplateSourcePosition
} from '@opticss/element-analysis';
import { NodePath, Binding } from 'babel-traverse';
import {
  CallExpression,
  JSXOpeningElement,
  isCallExpression,
  isIdentifier,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isMemberExpression,
  Expression,
  Node,
  isVariableDeclarator,
  JSXAttribute,
  Identifier,
  SourceLocation,
} from 'babel-types';

import { MalformedBlockPath, TemplateAnalysisError } from '../utils/Errors';
import { isConsoleLogStatement } from '../utils/isConsoleLogStatement';

import { JSXElementAnalysis, Flags, newJSXElementAnalysis } from './types';
import { isStyleFunction, isCommonNameForStyling } from '../styleFunctions';
import { ExpressionReader, isBlockStateGroupResult, isBlockStateResult } from '../utils/ExpressionReader';

export class JSXElementAnalyzer {
  private filename: string;
  private classProperties: Flags;
  private blocks: ObjectDictionary<Block>;

  constructor(blocks: ObjectDictionary<Block>, filename: string) {
    this.blocks = blocks;
    this.filename = filename;
    this.classProperties = {
      class: true,
      className: true
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
      attrPath = (<any>attrPath).getNextSibling() as NodePath<JSXAttribute> | undefined;
    }
    return found;
  }

  analyze(path: NodePath<JSXOpeningElement>): JSXElementAnalysis | undefined {
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

  private analyzeClassAttribute(path: NodePath<JSXAttribute>, element: JSXElementAnalysis): void {
    let value = path.node.value;
    if (!isJSXExpressionContainer(value)) return; // should this be an error?
    // If this attribute's value is an expression, evaluate it for block references.
    // Discover block root identifiers.
    if (isIdentifier(value.expression)) {
      let identifier = value.expression;
      let identBinding = path.scope.getBinding(identifier.name);
      if (identBinding) {
        if (identBinding.constantViolations.length > 0) {
          throw new TemplateAnalysisError(`illegal assignment to a style variable.`, this.nodeLoc(identBinding.constantViolations[0]));
        }
        if (identBinding.kind === 'module') {
          let name = identifier.name;
          // Check if there is a block of this name imported. If so, save style and exit.
          let block: Block | undefined = this.blocks[name];
          if (block) {
            element.addStaticClass(block);
          } else {
            throw new TemplateAnalysisError(`No block named ${name} was found`, this.nodeLoc(value));
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
                  throw new TemplateAnalysisError(`illegal use of a style variable.`, this.nodeLoc(parentPath));
                }
              }
            }
          } else {
            throw new TemplateAnalysisError(`variable for class attributes must be initialized with a style expression.`, this.nodeLoc(value));
          }
          this.addPossibleDynamicStyles(element, initialValueOfIdent, identBinding.path);
        }
      }
    } else if (isMemberExpression(value.expression)) {
      // Discover direct references to an imported block.
      // Ex: `blockName.foo` || `blockName['bar']` || `blockName.bar()`
      let parts: ExpressionReader = new ExpressionReader(value.expression, this.filename);
      let expressionResult = parts.getResult(this.blocks);
      let blockOrClass = expressionResult.blockClass || expressionResult.block;
      if (isBlockStateGroupResult(expressionResult) || isBlockStateResult(expressionResult)) {
        throw new Error('internal error, not expected on a member expression');
      } else {
        element.addStaticClass(blockOrClass);
      }
    } else if (isCallExpression(value.expression)) {
      let styleFn = isStyleFunction(path, value.expression);
      if (styleFn.type === 'error') {
        if (styleFn.canIgnore) {
          // It's not a style helper function, assume it's a static reference to a state.
          try {
            let parts: ExpressionReader = new ExpressionReader(value.expression, this.filename);
            let expressionResult = parts.getResult(this.blocks);
            let blockOrClass = expressionResult.blockClass || expressionResult.block;
            if (isBlockStateGroupResult(expressionResult)) {
              element.addDynamicGroup(blockOrClass, expressionResult.stateGroup, expressionResult.dynamicStateExpression, false);
            } else if (isBlockStateResult(expressionResult)) {
              element.addStaticState(blockOrClass, expressionResult.state);
            } else {
              throw new Error('internal error, not expected on a call expression');
            }
          } catch (e) {
            if (e instanceof MalformedBlockPath) {
              if (isIdentifier(value.expression.callee)) {
                let fnName = value.expression.callee.name;
                if (isCommonNameForStyling(fnName)) {
                  throw new TemplateAnalysisError(`The call to style function '${fnName}' does not resolve to an import statement of a known style helper.`, this.nodeLoc(value.expression));
                } else {
                  throw new TemplateAnalysisError(`Function called within class attribute value '${fnName}' must be either an 'objstr' call, or a state reference`, this.nodeLoc(value.expression));
                }
              }
            }
            throw e;
          }
        } else {
          throw new TemplateAnalysisError(styleFn.message, styleFn.location);
        }
      } else {
        styleFn.analyze(this.blocks, element, this.filename, styleFn, value.expression);
      }
    } else {
      // TODO handle ternary expressions like style-if in handlebars?
    }
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