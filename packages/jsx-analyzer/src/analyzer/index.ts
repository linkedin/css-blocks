import { objectValues } from '@opticss/util/dist/src';
import { NodePath, Binding } from 'babel-traverse';
import { Block, BlockClass, State, isBlockClass, isBlock, isState } from 'css-blocks';
import {
  CallExpression,
  JSXOpeningElement,
  JSXAttribute,
  ObjectMethod,
  ObjectProperty,
  SpreadProperty,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isJSXNamespacedName,
  isLiteral,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral
} from 'babel-types';

import Analysis from '../utils/Analysis';
import { ExpressionReader } from '../utils/ExpressionReader';
import { TemplateAnalysisError } from '../utils/Errors';

const OBJSTR_PACKAGE_NAME = 'obj-str';
const STATE_NAMESPACE = 'state';

// Properties to check for block classes applied
const CLASS_PROPERTIES = {
  'class': 1,
  'className': 1
};

type Property = ObjectProperty | SpreadProperty | ObjectMethod;

/**
 * Given a well formed Object String `CallExpression`, add all Block style references
 * to the given analysis object.
 * @param analysis This template's analysis object.
 * @param path The objstr CallExpression Path.
 */
function saveObjstrProps(analysis: Analysis, path: any) {

  // If this node is not a call expression (ex: `objstr({})`), or is a complex
  // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
  // short circuit and continue execution.
  let func: CallExpression = path.node;
  if ( !isCallExpression(func) || !isIdentifier(func.callee) ) {
    return;
  }

  // Fetch the function name. If we can't get the name, or the function is not in scope, throw
  let name = func.callee.name;
  let binding: Binding | undefined = path.scope.getBinding(name);
  if ( !binding ) { return; }

  // If this call expression is not an `objstr` call, or is in a form we don't
  // recognize (Ex: first arg is not an object), short circuit and continue execution.
  let funcDef = binding.path.parent;
  let isObjstr = isImportDeclaration(funcDef) && funcDef.source.value ===  OBJSTR_PACKAGE_NAME;
  if ( !isObjstr ) {
    return;
  }

  // Location object for error reporting
  let loc = {
    filename: analysis.template.identifier,
    line: path.node.loc.start.line,
    column: path.node.loc.start.column
  };

  // We consider every `objstr` call a single element's styles. Start a new element.
  let element = analysis.startElement(loc);

  // Ensure the first argument passed to suspected `objstr` call is an object.
  let obj: any = func.arguments[0];
  if ( !isObjectExpression(obj) ) {
    throw new TemplateAnalysisError(`First argument passed to "objstr" call must be an object literal.`, loc);
  }

  // For each property passed to objstr, parse the expression and attempt to save the style.
  obj.properties.forEach((prop: Property) => {

    // Ignore non computed properties, they will never be blocks objects.
    if ( !isObjectProperty(prop) || prop.computed === false ) {
      return;
    }

    // Get expression from computed property name and save to analysis.
    let parts: ExpressionReader = new ExpressionReader(prop.key, analysis);

    // Save all discovered BlockObjects to analysis
    parts.concerns.forEach( (style) => {
      if (isLiteral(prop.value)) {
        if (isBlockClass(style)) {
          element.addStaticClass(style);
        } else if (isBlock(style)) {
          element.addStaticClass(style);
        } else if (isState(style)) {
          element.addStaticState(style);
        }
      } else {
        if (isBlockClass(style) || isBlock(style)) {
          element.addDynamicClasses({condition: prop.value, whenTrue: [style]});
        } else if (isState(style)) {
          // TODO
          // element.addDynamicGroup(parent, style.group, prop.value, true);
        } else if (isState(style)) {
          element.addDynamicState(style, prop.value);
        }

      }
    });

  });

  analysis.endElement(element);
}

/**
 * Babel visitors we can pass to `babel-traverse` to run analysis on a given JSX file.
 * @param analysis The Analysis object to store our results in.
 */
export default function visitors(analysis: Analysis): object {
  return {

    // Find all objstr class expressions. Parse as though a single element's styles.
    CallExpression(path: NodePath<CallExpression>, state: any): void {
      saveObjstrProps(analysis, path);
    },

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

      let loc = {
        filename: analysis.template.identifier,
        line: path.node.loc.start.line,
        column: path.node.loc.start.column,
      };

      let element = analysis.startElement(loc);

      el.attributes.forEach((attr: JSXAttribute) => {

        // Get the property name and value.
        let property = attr.name;
        let value = attr.value;

        // If processing class names
        if ( isJSXIdentifier(property) && CLASS_PROPERTIES[property.name] ) {

          // If this attribute's value is an expression, evaluate it for block references.
          if ( isJSXExpressionContainer(value) ) {

            // Discover block root identifiers.
            if ( isIdentifier(value.expression) ) {
              let identifier = value.expression;
              let name = identifier.name;

              // Check if there is a block of this name imported. If so, save style and exit.
              let block: Block | undefined = analysis.blocks[name];
              if ( block ) {
                element.addStaticClass(block);
                return;
              }
            }

            // Discover direct references to an imported block.
            // Ex: `blockName.foo` || `blockName['bar']` || `blockName.bar()`
            if ( isMemberExpression(value.expression) || isCallExpression(value.expression) ) {
              let expression: any = value.expression;
              let parts: ExpressionReader = new ExpressionReader(expression, analysis);
              parts.concerns.forEach( (style) => {
                if (isBlockClass(style)) {
                  element.addStaticClass(style);
                } else if (isBlock(style)) {
                  element.addStaticClass(style);
                } else if (isState(style)) {
                  element.addStaticState(style);
                }
              });
            }
          }
        }

        // Handle state attributes
        else if ( isJSXNamespacedName(property) ) {

          // If this namespace is something more complex than an identifier, or is not
          // `state`, we don't care.
          if ( !isJSXIdentifier(property.namespace) || property.namespace.name !== STATE_NAMESPACE ) {
            return;
          }

          // Fetch selector parts and look for a block under the local name.
          let reader: ExpressionReader = new ExpressionReader(property.name, analysis);
          let blockName: string | undefined = reader.next();
          let className: string | undefined = reader.next();
          let stateName: string | undefined = reader.next() || className;

          // If there is no block imported under this local name, this is a class
          // we don't care about. Return.
          let block: Block | undefined = (blockName) ? analysis.blocks[blockName] : undefined;
          if ( !block || !stateName ) {
            return;
          }

          // If this is a block reference, fetch the class referenced in this selector.
          let classBlock: BlockClass | undefined = ( className ) ? block.getClass(className) : undefined;

          // Now that we have our block or class, fetch the requested state object.
          let states = (classBlock || block).states.resolveGroup(stateName);
          let isDynamic = true;

          // If value is set to a string literal value, we only need to register the single state.
          if ( isStringLiteral(value) ) {
            let state: State | undefined = (classBlock || block).states.getState(value.value, stateName);

            // If no state was returned, It may be a boolean state. Try to just get it by attribute name.
            if ( !state ) {
              state = (classBlock || block).states.getState(stateName);
            }

            states = state ? {[state.name]: state} : undefined;
            isDynamic = false;
          }

          // If value is set to a null, this must be a boolean state.
          else if ( value === null ) {
            let state: State | undefined = (classBlock || block).states.getState(stateName);
            states = state ? {[state.name]: state} : undefined;
            isDynamic = false;
          }

          // If we have  not discovered a state object, or if the user is referencing
          // a namespace other than a class or root, throw.
          if ( !states ) {
            // TODO: Add location data in error message.
            throw new TemplateAnalysisError(`Attempted to access non-existent state "${stateName}" on block class namespace "${reader.toString()}"`, loc);
          }

          // Register all states with our analysis
          if (states) {
            if (isDynamic) {
              element.addDynamicGroup((classBlock || block), states, value, true);
            } else {
              let values = objectValues(states);
              if (values.length > 1) throw new Error('Internal Error.');
              for (let state of values) {
                element.addStaticState(state);
              }
            }
          }
        }
      });

      analysis.endElement(element);
    }
  };
}
