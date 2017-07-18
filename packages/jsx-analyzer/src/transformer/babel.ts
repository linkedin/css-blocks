import { Block, BlockClass, State, StyleMapping } from 'css-blocks';
import { NodePath, Binding } from 'babel-traverse';
import { ExpressionReader } from '../utils/ExpressionReader';
import { Template } from '../utils/Analysis';
import {
  Program,
  JSXOpeningElement,
  JSXAttribute,
  isJSXIdentifier,
  isJSXExpressionContainer,
  isIdentifier,
  isVariableDeclarator,
  isCallExpression,
  isMemberExpression,
  isJSXNamespacedName,
  ImportDeclaration,
  stringLiteral,
  ObjectProperty,
  isImportDeclaration,
  isObjectExpression,
  ObjectExpression,
  isObjectProperty
} from 'babel-types';

let { parse } = require('path');

// Properties to check for block classes applied
// TODO: Consolidate constants across visitor files.
const OBJSTR_PACKAGE_NAME = 'obj-str';
const CLASS_PROPERTIES = {
  'class': 1,
  'className': 1
};
const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.

// TODO: THis expression parsing logic can be abstracted out and shared
//       with the analyzer in `utils/ExpressionReader.ts`.

interface Expression {
  blockName?: string | undefined;
  className?: string | undefined;
  groupName?: string | undefined;
  stateName?: string | undefined;
  block?: Block | undefined;
  class?: BlockClass | undefined;
  state?: State | undefined;
  str: string;
}

function expParts(parts: ExpressionReader, mapping: StyleMapping<Template>): Expression {

  let res: Expression = {
    str: ''
  };

  // Fetch our possible block identifier parts.
  res.blockName = parts.next();
  res.block = mapping.blocks[res.blockName || ''];

  if ( !res.block ) {
    return res;
  }

  let stateIdentifier = mapping.template.localStates[res.blockName || ''];

  res.className = parts.next();

  // If we have encountered the state identifier, clean class name if needed
  // (ex: a BlockState), fetch potential group and state names, then determine
  // if we're dealing with a substate or state.
  if (res.className === stateIdentifier || parts.next() === stateIdentifier) {
    if ( res.className === stateIdentifier) {
      res.className = undefined;
    }

    res.groupName = parts.next();
    res.stateName = parts.next();

    if ( !res.stateName ) {
      res.stateName = res.groupName;
      res.groupName = undefined;
    }
  }

  // If this is a block reference, fetch the class referenced in this selector.
  res.class = ( res.className ) ? res.block.getClass(res.className) : undefined;

  // Now that we have our block or class, fetch the requested state object.
  res.state = res.stateName && (res.class || res.block).states.getState(res.stateName, res.groupName) || undefined;

  // Depending on the final block object we found, replace the property with the appropreate class.
  res.str = (mapping.blockMappings.get(res.state || res.class || res.block) || []).join(' ');

  return res;
}

/**
 * Given a well formed Object String `CallExpression`, replace all BlockObject expressions
 * with the style mapping. If input is not a well formed Object String, skip silently.
 * @param mapping The current StyleMapping we are observing for access to scope.
 * @param path The JSX Element's path object.
 * @param func The Object String `CallExpression` to process.
 * @returns The array of `Property` values passed to Object String
 */
function swapObjstrProps(mapping: StyleMapping<Template>, path: NodePath<any>, func: any) {
  let props: ObjectProperty[] = [];

  // If this node is not a call expression (ex: `objstr({})`), or is a complex
  // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
  // short circuit and continue execution.
  if ( !isCallExpression(func) || !isIdentifier(func.callee) ) {
    return;
  }

  // Fetch the function name. If we can't get the name, or the function is not in scope, throw
  let name = func.callee.name;
  let binding: Binding | undefined = path.scope.getBinding(name);
  if ( !binding ) {
    throw new Error(`Variable "${name}" is undefined`);
  }

  // If this call expression is not an `objstr` call, or is in a form we don't
  // recognize (Ex: first arg is not an object), short circuit and continue execution.
  let funcDef = binding.path.parent;
  let isObjstr = isImportDeclaration(funcDef) && funcDef.source.value ===  OBJSTR_PACKAGE_NAME;
  if ( !isObjstr || !isObjectExpression(func.arguments[0]) ) {
    return;
  }

  props = (<ObjectExpression>func.arguments[0]).properties.filter(isObjectProperty);

  if ( !props ) {
    throw new Error(`Class attribute value "${name}" must be either an "objstr" call, or a Block reference`);
  }

  // For each property passed to objstr, parse the expression and attempt to save the style.
  props.forEach((prop: ObjectProperty) => {

    // Ignore non computed properties, they will never be blocks objects.
    if ( prop.computed === false ) {
      return;
    }

    // Get expression from computed property name.
    let parts: ExpressionReader = new ExpressionReader(prop.key);

    // Parse the expression to fetch class mapping
    let exp: Expression = expParts(parts, mapping);

    // Replace with new string
    if ( exp.block ) {
      prop.key = stringLiteral(exp.str);
    }

  });
}

export default function transform(): any {
  let filename = '';
  let mapping: StyleMapping<Template>;
  let shouldProcess = true;

  return {
    visitor: {

      // Ensure we're parsing .*sx files, and that the file has blocks associated with it.
      Program(path: NodePath<Program>, state: any){
        filename = state.file.opts.filename;

        if ( parse(filename).ext !== '.tsx' && parse(filename).ext !== '.jsx' ) {
          shouldProcess = false;
          return;
        }

        // Fetch the block mapping object. If no blocks were found in this file,
        // there is no need to parse it. Set flag to short circuit babel plugin.
        mapping = state.opts.rewriter.blocks[filename];
        shouldProcess = !!(mapping && Object.keys(mapping.blocks).length);
      },

      // If this is a CSS Blocks import, remove it.
      ImportDeclaration(nodepath: NodePath<ImportDeclaration>) {

        if ( !shouldProcess ) {
          return;
        }

        if ( !!~nodepath.node.source.value.indexOf(BLOCK_SUFFIX) ) {
          nodepath.remove();
        }
      },

      JSXOpeningElement(path: NodePath<JSXOpeningElement>, state: any): void {

        if ( !shouldProcess ) {
          return;
        }

        let el = path.node;

        // We don't care about elements with no attributes;
        if ( !el.attributes || el.attributes.length === 0 ) {
          return;
        }

        el.attributes.forEach((attr: JSXAttribute) => {

          // Get the property name and value.
          let property = attr.name;
          let value = attr.value;

          // If processing class names
          if ( isJSXIdentifier(property) && CLASS_PROPERTIES[property.name] ) {

            // If this attribute's value is an expression, evaluate it for block references.
            if ( isJSXExpressionContainer(value) ) {

              // Discover identifiers we are concerned with. These include Block root
              // references and `objstr` references in scope that contain block objects.
              // ex: `blockname` || `objstrVar`
              if ( isIdentifier(value.expression) ) {

                let name = value.expression.name;

                // Check if there is a block of this name imported. If so, add style and exit.
                if ( mapping.blocks[name] ) {
                  let block = mapping.blocks[name];
                  let str = (mapping.blockMappings.get(block) || '')[0];
                  attr.value = stringLiteral(str);
                  return;
                }

                // If there is no `name` in scope, throw
                let binding: Binding | undefined = path.scope.getBinding(name);
                if ( !binding ) {
                  throw new Error(`Variable "${name}" is undefined`);
                }

                // Yup, `any`. We're about to do a lot of type checking
                let objstr: any = binding.path.node;

                // We most likely got a varialbe declarator, unwrap the value. We're
                // going to test if its the objstr call.
                if ( isVariableDeclarator(objstr) ) {
                  objstr = objstr.init;
                }

                // Optimistically assume we have an objstr call and try to save it.
                // Will fail silently and continue with exection if it is not an objstr call.
                swapObjstrProps(mapping, path, objstr);

              }

              // If we discover an inlined call expression, assume it is an objstr call
              // until proven otherwise. Fails silently and continues with execution if is not.
              if ( isCallExpression(value.expression) ) {
                swapObjstrProps(mapping, path, value.expression);
              }

              // Discover direct references to an imported block.
              // Ex: `blockName.foo` || `blockname['bar']`
              if ( isMemberExpression(value.expression) ) {
                let expression: any = value.expression;
                let parts: ExpressionReader = new ExpressionReader(expression);

                // Parse the expression to fetch class mapping
                let exp: Expression = expParts(parts, mapping);

                // Replace with new string
                if ( exp.block ) {
                  attr.value = stringLiteral(exp.str);
                }
              }
            }
          }

          // Handle state attributes
          else if ( isJSXNamespacedName(property) ) {
            // TODO: Handle state attributes
          }
        });

      }
    }
  };
}
