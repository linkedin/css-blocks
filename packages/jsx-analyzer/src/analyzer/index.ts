import { ElementAnalysis } from 'css-blocks/dist/src/TemplateAnalysis/ElementAnalysis';
import { ObjectDictionary } from '@opticss/util/dist/src';
import { NodePath, Binding } from 'babel-traverse';
import { Block } from 'css-blocks';
import {
  CallExpression,
  JSXOpeningElement,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isLiteral,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  Expression,
  logicalExpression,
  BooleanLiteral,
  isBooleanLiteral,
  Node,
  isVariableDeclarator,
  isSpreadElement,
} from 'babel-types';

import Analysis from '../utils/Analysis';
import { ExpressionReader, isBlockStateGroupResult, isBlockStateResult } from '../utils/ExpressionReader';
import { ErrorLocation, MalformedBlockPath, TemplateAnalysisError } from '../utils/Errors';

const OBJSTR_PACKAGE_NAME = 'obj-str';
// const STATE_NAMESPACE = 'state';

// Properties to check for block classes applied
const CLASS_PROPERTIES = {
  'class': true,
  'className': true
};

type BooleanExpression = Expression;
type StringExpression = Expression;
type TernaryExpression = Expression;

/**
 * Given a well formed style expression `CallExpression`, add all Block style references
 * to the given analysis object.
 * @param analysis This template's analysis object.
 * @param path The objstr CallExpression Path.
 */
function addPossibleDynamicStyles(blocks: ObjectDictionary<Block>, element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>, filename: string, expression: Expression, path: NodePath<Node>) {

  // If this node is not a call expression (ex: `objstr({})`), or is a complex
  // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
  // short circuit and continue execution.
  if ( !isCallExpression(expression) ) {
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
      throw new TemplateAnalysisError(styleFunc.message, {filename, ...styleFunc.location});
    }
  }
  addDynamicStyles(blocks, element, filename, styleFunc, func);
}

function addDynamicStyles(blocks: ObjectDictionary<Block>, element: ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>, filename: string, styleFn: StyleFunction, func: CallExpression ) {

  // Location object for error reporting
  let loc = {
    filename,
    line: func.loc.start.line,
    column: func.loc.start.column
  };

  // Ensure the first argument passed to suspected `objstr` call is an object.
  let obj: any = func.arguments[0];
  if ( !isObjectExpression(obj) ) {
    throw new TemplateAnalysisError(`First argument passed to "objstr" call must be an object literal.`, {filename, ...func.loc.start});
  }

  let foundBlockObj = false;
  let foundNonBlockObj = false;

  // For each property passed to objstr, parse the expression and attempt to save the style.
  for (let prop of obj.properties) {

    // Ignore non computed properties, they will never be blocks objects.
    if ( !isObjectProperty(prop) || prop.computed === false ) {
      foundNonBlockObj = true;
      if (foundBlockObj) {
        throw new TemplateAnalysisError(`Cannot mix class names with block styles.`, {filename, ...prop.loc.start});
      }
      continue;
    }

    // Get expression from computed property name and save to analysis.
    let parts: ExpressionReader = new ExpressionReader(prop.key, loc.filename);

    if (parts.isBlockExpression) {
      foundBlockObj = true;
      if (foundNonBlockObj) {
        throw new TemplateAnalysisError(`Cannot mix class names with block styles.`, {filename, ...prop.loc.start});
      }
    }
    let result = parts.getResult(blocks);
    let rightHandLiteral: BooleanLiteral | undefined = undefined;
    let rightHandExpr = prop.value;
    if (isLiteral(rightHandExpr)) {
      if (isBooleanLiteral(rightHandExpr)) {
        rightHandLiteral = rightHandExpr;
      } else {
        throw new TemplateAnalysisError('Right hand side of an objstr style must be a boolean literal or an expression.', {filename, ...rightHandExpr.loc.start});
      }
    }

    if (isBlockStateGroupResult(result)) {
      if (rightHandLiteral) {
        // It's set to true or false
        if (rightHandLiteral.value) {
          if ( isSpreadElement(result.dynamicStateExpression) ) {
            throw new TemplateAnalysisError('The spread operator is not allowed in CSS Block states.', {filename, ...result.dynamicStateExpression.loc.start});
          } else {
            // if truthy, the only dynamic expr is from the state selector.
            element.addDynamicGroup(result.blockClass || result.block, result.stateGroup, result.dynamicStateExpression, true);
          }
        } // else ignore
      } else {
        let orExpression = logicalExpression('||', prop.value, result.dynamicStateExpression);
        element.addDynamicGroup(result.blockClass || result.block, result.stateGroup, orExpression, false);
      }

    } else if (isBlockStateResult(result)) {
      if (rightHandLiteral) {
        if (rightHandLiteral.value) {
          element.addStaticState(result.blockClass || result.block, result.state);
        } // else ignore
      } else {
        element.addDynamicState(result.blockClass || result.block, result.state, rightHandExpr);
      }
    } else {
      let blockOrClass = result.blockClass || result.block;
      if (rightHandLiteral) {
        if (rightHandLiteral.value) {
          element.addStaticClass(blockOrClass);
        } // else ignore
      } else {
        element.addDynamicClasses({condition: rightHandExpr, whenTrue: [blockOrClass]});
      }
    }
  }
}

/**
 * Babel visitors we can pass to `babel-traverse` to run analysis on a given JSX file.
 * @param analysis The Analysis object to store our results in.
 */
export default function visitors(analysis: Analysis): object {
  return {

    /**
     * Primary analytics parser for Babylon. Crawls all JSX Elements and their attributes
     * and saves all discovered block references. See README for valid JSX CSS Block APIs.
     * @param path The JSXOpeningElement Babylon path we are processing.
     */
    JSXOpeningElement(path: NodePath<JSXOpeningElement>): void {

      let el = path.node;

      // We don't care about elements with no attributes;
      if ( !el.attributes || el.attributes.length === 0 ) {
        return;
      }
      let filename = analysis.template.identifier;

      let loc = {
        filename,
        line: path.node.loc.start.line,
        column: path.node.loc.start.column,
      };

      let classAttrs = el.attributes.filter(attr => isJSXIdentifier(attr.name) && CLASS_PROPERTIES[attr.name.name]);
      if (classAttrs.length === 0) return;
      let element = analysis.startElement<BooleanExpression, StringExpression, TernaryExpression>(loc, htmlTagName(el));
      for (let classAttr of classAttrs) {
        let value = classAttr.value;
        // If this attribute's value is an expression, evaluate it for block references.
        if (isJSXExpressionContainer(value)) {

          // Discover block root identifiers.
          if (isIdentifier(value.expression)) {
            let identifier = value.expression;
            let identBinding = path.scope.getBinding(identifier.name);
            if (identBinding) {
              if (identBinding.constantViolations.length > 0) {
                throw new TemplateAnalysisError(`illegal assignment to a style variable.`, {filename: loc.filename, ...identBinding.constantViolations[0].node.loc.start});
              }
              if (identBinding.kind === 'module') {
                let name = identifier.name;
                // Check if there is a block of this name imported. If so, save style and exit.
                let block: Block | undefined = analysis.blocks[name];
                if (block) {
                  element.addStaticClass(block);
                } else {
                  throw new TemplateAnalysisError(`No block named ${name} was found`, {filename: loc.filename, ...value.loc.start});
                }
              } else {
                let identPathNode = identBinding.path.node;
                let initialValueOfIdent: Expression;
                if (isVariableDeclarator(identPathNode)) {
                  initialValueOfIdent = identPathNode.init;
                  if (identBinding.references > 1) {
                    for (let refPath of identBinding.referencePaths.filter(p => p.parentPath.type !== 'JSXExpressionContainer')) {
                      let parentPath = refPath.parentPath;
                      if (!isConsoleDotLog(parentPath.node)) {
                        throw new TemplateAnalysisError(`illegal use of a style variable.`, {filename: loc.filename, ...parentPath.node.loc.start});
                      }
                    }
                  }
                } else {
                  throw new TemplateAnalysisError(`variable for class attributes must be initialized with a style expression.`, {filename: loc.filename, ...value.loc.start});
                }
                addPossibleDynamicStyles(analysis.blocks, element, filename, initialValueOfIdent, identBinding.path);
              }
            }
          } else if (isMemberExpression(value.expression)) {
            // Discover direct references to an imported block.
            // Ex: `blockName.foo` || `blockName['bar']` || `blockName.bar()`
            let parts: ExpressionReader = new ExpressionReader(value.expression, loc.filename);
            let expressionResult = parts.getResult(analysis.blocks);
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
                // Discover direct references to an imported block.
                // Ex: `blockName.foo` || `blockName['bar']` || `blockName.bar()`
                try {
                  let parts: ExpressionReader = new ExpressionReader(value.expression, loc.filename);
                  let expressionResult = parts.getResult(analysis.blocks);
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
                      if (value.expression.callee.name === 'objstr') {
                        throw new TemplateAnalysisError(`The call to style function '${value.expression.callee.name}' does not resolve to an import statement of a known style helper.`, value.expression.loc.start);
                      } else {
                        throw new TemplateAnalysisError(`Function called within class attribute value '${value.expression.callee.name}' must be either an 'objstr' call, or a state reference`, value.expression.loc.start);
                      }
                    }
                  }
                  throw e;
                }
              } else {
                throw new TemplateAnalysisError(styleFn.message, styleFn.location);
              }
            } else {
              addDynamicStyles(analysis.blocks, element, filename, styleFn, value.expression);
            }
          } else {
            // TODO handle ternary expressions like style-if in handlebars?
          }
        }
      }

      // el.attributes.forEach((attr: JSXAttribute) => {
        // TODO: implement state attributes when it is supported.
        // Look up (optionally block-scoped) states against the state containers found in the class attribute.
        // add them here accordingly.
      // });

      analysis.endElement(element);
    }
  };
}

function isConsoleDotLog(node: Node): boolean {
  if (isCallExpression(node)) {
    if (node.callee) {
      let callee = node.callee;
      if (isMemberExpression(callee) && isIdentifier(callee.object) && callee.object.name === 'console') {
        return true;
      }
    }
  }
  return false;
}

interface ObjStrStyleFunction {
  type: 'obj-str';
  name: string;
}

type StyleFunction = ObjStrStyleFunction;

interface StyleFunctionError {
  type: 'error';
  canIgnore: boolean;
  message: string;
  location: ErrorLocation;
}

function isStyleFunction(path: NodePath<Node>, expression: CallExpression): StyleFunction | StyleFunctionError {
  let binding: Binding | undefined = undefined;
  if (isIdentifier(expression.callee)) {
    binding = path.scope.getBinding(expression.callee.name);
    if (!binding) {
      return {
        type: 'error',
        canIgnore: false,
        message: `Undefined function for styling: ${expression.callee.name}`,
        location: expression.callee.loc.start
      };
    }
  }
  if (!binding) {
    return {
      type: 'error',
      canIgnore: true,
      message: `unexpected function for styling`,
      location: expression.callee.loc.start
    };
  }
  let funcDef = binding.path.parent;
  if (isImportDeclaration(funcDef)) {
    let fn: StyleFunction;
    switch (funcDef.source.value) {
      case OBJSTR_PACKAGE_NAME:
        fn = { type: 'obj-str', name: binding.identifier.name };
        break;
      default:
        return {
          type: 'error',
          canIgnore: true,
          message: 'style function is not an import',
          location: funcDef.loc.start
        };
    }
    if (binding.constantViolations.length > 0) {
      return {
        type: 'error',
        canIgnore: false,
        message: `Cannot override the ${fn.name} import of '${fn.type}'`,
        location: binding.constantViolations[0].node.loc.start
      };
    }
    return fn;
  } else {
    return {
      type: 'error',
      canIgnore: true,
      message: 'style function is not an import',
      location: funcDef.loc.start
    };
  }
}

function htmlTagName(el: JSXOpeningElement): string | undefined {
  if (isJSXIdentifier(el.name) && el.name.name === el.name.name.toLowerCase()) {
    return el.name.name;
  }
  return;
}