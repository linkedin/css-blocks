import { ObjectDictionary, } from '@opticss/util';
import { Binding } from 'babel-traverse';
import { ImportDeclaration } from 'babel-types';
import {
  BooleanLiteral,
  CallExpression,
  isBooleanLiteral,
  isLiteral,
  isObjectExpression,
  isObjectProperty,
  isSpreadElement,
  logicalExpression,
} from 'babel-types';
import { Block } from 'css-blocks';

import { JSXElementAnalysis } from '../analyzer/types';
import { TemplateAnalysisError } from '../utils/Errors';
import { ExpressionReader, isBlockStateGroupResult, isBlockStateResult } from '../utils/ExpressionReader';

import { StyleFunctionAnalyzer } from './common';

/**
 * objstr() is a preact idiom for expressing class names. It is similar to the classnames library
 * but simpler and more performant.
 *
 * CSS Blocks builds on this to allow a css-block style to be used as a class name,
 * in a way that is familiar to a preact developer.
 *
 * An objstr in css blocks takes the form of called with an object literal.
 *
 * The properties of the object literal are dynamic property expressions with the expression being
 * a legal css-block style expression on an imported block.
 *
 * When a value of the object literal is truthy the style is set on the element to which the classes
 * are eventually assigned.
 *
 * Both classes and states can be assigned to the element, however, the states associated
 * with a class are automatically disabled if that class is not set on the element.
 *
 * styles that are set to a `true` literal value are treated as static styles and the
 * rewriter will set them as static string values.
 **/

export const PACKAGE_NAME = 'obj-str';
export const COMMON_NAMES = { 'objstr': true };

export interface ObjStrStyleFunction {
  type: 'obj-str';
  name: 'objstr';
  localName: string;
  analyze: StyleFunctionAnalyzer<ObjStrStyleFunction>;
}

/**
 * Return information about an objstr binding.
 */
export function objstrFn(binding: Binding, funcDef: ImportDeclaration): ObjStrStyleFunction | undefined {
  if (funcDef.source.value === PACKAGE_NAME) {
    return { type: 'obj-str', name: 'objstr', localName: binding.identifier.name, analyze: analyzeObjstr };
  }
  return;
}

export function analyzeObjstr(blocks: ObjectDictionary<Block>, element: JSXElementAnalysis, filename: string, styleFn: ObjStrStyleFunction, func: CallExpression) {

  // Location object for error reporting
  let loc = {
    filename,
    line: func.loc.start.line,
    column: func.loc.start.column
  };

  // Ensure the first argument passed to suspected `objstr` call is an object.
  let obj: any = func.arguments[0];
  if (!isObjectExpression(obj)) {
    throw new TemplateAnalysisError(`First argument passed to "objstr" call must be an object literal.`, {filename, ...func.loc.start});
  }

  let foundBlockObj = false;
  let foundNonBlockObj = false;

  // For each property passed to objstr, parse the expression and attempt to save the style.
  for (let prop of obj.properties) {

    // Ignore non computed properties, they will never be blocks objects.
    if (!isObjectProperty(prop) || prop.computed === false) {
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
          if (isSpreadElement(result.dynamicStateExpression)) {
            throw new TemplateAnalysisError('The spread operator is not allowed in CSS Block states.', {filename, ...result.dynamicStateExpression.loc.start});
          } else {
            // if truthy, the only dynamic expr is from the state selector.
            element.addDynamicGroup(result.blockClass || result.block, result.stateGroup, result.dynamicStateExpression, true);
          }
        } // else ignore
      } else {
        let orExpression = logicalExpression('&&', prop.value, result.dynamicStateExpression);
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