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
  isStringLiteral,
  ImportDeclaration,
  stringLiteral
} from 'babel-types';

let { parse } = require('path');

// Properties to check for block classes applied
// TODO: Consolidate constants across visitor files.
const STATE_NAMESPACE = 'state';
const CLASS_PROPERTIES = {
  'class': 1,
  'className': 1
};
const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.

export default function transform(): any {
  let filename = '';
  let mapping: StyleMapping<Template>;
  return {
    visitor: {

      // Ensure we're parsing .*sx files, and that the file has blocks associated with it.
      Program(path: NodePath<Program>, state: any){
        filename = state.file.opts.filename;

        if ( parse(filename).ext !== '.tsx' && parse(filename).ext !== '.jsx' ) {
          return;
        }

        mapping = state.opts.rewriter.blocks[filename] && state.opts.rewriter.blocks[filename].options.cssBlocks.styleMapping;

        if ( !mapping || !mapping.blocks ) {
          return;
        }

      },

      // If this is a CSS Blocks import, remove it.
      ImportDeclaration(nodepath: NodePath<ImportDeclaration>) {
        if ( !mapping || !mapping.blocks ) {
          return;
        }
        if ( !!~nodepath.node.source.value.indexOf(BLOCK_SUFFIX) ) {
          nodepath.remove();
        }
      },

      JSXOpeningElement(path: NodePath<JSXOpeningElement>, state: any): void {
        if ( !mapping || !mapping.blocks ) {
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
                let identifier = value.expression;
                let name = identifier.name;

                // Check if there is a block of this name imported. If so, add style and exit.
                if ( mapping.blocks[name] ) {
                  let block = mapping.blocks[name];
                  console.log('found block:', block );
                  attr.value = stringLiteral('BAHHHHHHH');
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
                // saveObjstrProps(analysis, path, objstr);

              }

              // If we discover an inlined call expression, assume it is an objstr call
              // until proven otherwise. Fails silently and continues with execution if is not.
              if ( isCallExpression(value.expression) ) {
                // saveObjstrProps(analysis, path, value.expression);
              }

              // Discover direct references to an imported block.
              // Ex: `blockName.foo` || `blockname['bar']`
              if ( isMemberExpression(value.expression) ) {
                let expression: any = value.expression;
                let parts: ExpressionReader = new ExpressionReader(expression);
                let blockName: string | undefined = parts.next();
                // let className: string | undefined = reader.next();
                // let stateName: string | undefined = reader.next() || className;

                // Check if there is a block of this name imported. If so, add style and exit.
                if ( blockName && mapping.blocks[blockName] ) {
                  let block = mapping.blocks[blockName];
                  console.log('found block:', block );
                  attr.value = stringLiteral('BAHHHHHHHEXPRESSION');
                  return;
                }
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
            let reader: ExpressionReader = new ExpressionReader(property.name);
            let blockName: string | undefined = reader.next();
            let className: string | undefined = reader.next();
            let stateName: string | undefined = reader.next() || className;

            // If there is no block imported under this local name, this is a class
            // we don't care about. Return.
            let block: Block | undefined = (blockName) ? mapping.blocks[blockName]  : undefined;
            if ( !block || !stateName ) {
              return;
            }

            // If this is a block reference, fetch the class referenced in this selector.
            let classBlock: BlockClass | undefined = ( className ) ? block.getClass(className) : undefined;

            // Now that we have our block or class, fetch the requested state object.
            let states: State[] = (classBlock || block).states.getGroup(stateName);
            let isDynamic = true;

            // If value is set to a string literal value, we only need to register the single state.
            if ( isStringLiteral(value) ) {
              let state: State | undefined = (classBlock || block).states.getState(value.value, stateName);

              // If no state was returned, It may be a boolean state. Try to just get it by attribute name.
              if ( !state ) {
                state = (classBlock || block).states.getState(stateName);
              }

              states = state ? [ state ] : [];
              isDynamic = false;
            }

            // If value is set to a null, this must be a boolean state.
            else if ( value === null ) {
              let state: State | undefined = (classBlock || block).states.getState(stateName);
              states = state ? [ state ] : [];
              isDynamic = false;
            }

            // If we have  not discovered a state object, or if the user is referencing
            // a namespace other than a class or root, throw.
            if ( !states ) {
              // TODO: Add location data in error message.
              throw new Error(`Attempted to access non-existant state "${stateName}" on block class namespace "${reader.toString()}"`);
            }

            // Register all states with our analysis
            states.forEach((state: State) => {
              // analysis.addStyle(state, isDynamic);
            });

          }
        });

      }
    }
  };
}
