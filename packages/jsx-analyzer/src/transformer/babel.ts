import { BlockObject, StyleMapping, PluginOptionsReader } from 'css-blocks';
import { NodePath, Binding } from 'babel-traverse';
import {
  CallExpression,
  ImportDeclaration,
  Identifier,
  JSXOpeningElement,
  JSXAttribute,
  ObjectExpression,
  ObjectProperty,
  Program,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isJSXNamespacedName,
  isBooleanLiteral,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
  isSpreadElement,
  binaryExpression,
  logicalExpression,
  objectProperty,
  stringLiteral,
  variableDeclarator,
  variableDeclaration
} from 'babel-types';

import { ExpressionReader } from '../utils/ExpressionReader';
import isBlockFilename from '../utils/isBlockFilename';
import { TemplateRewriteError } from '../utils/Errors';

let { parse } = require('path');

// Properties to check for block classes applied
// TODO: Consolidate constants across visitor files.
const OBJSTR_PACKAGE_NAME = 'obj-str';
const CLASS_PROPERTIES = {
  'class': 1,
  'className': 1
};

function getBlockObjectClassnames(mapping: StyleMapping, test: BlockObject | undefined) : string {
  // Depending on the final block object we found, replace the property with the appropreate class.
  // TODO: Babel, in some transform modes, will deep clone all options passed in.
  //       This means we can't do a simple `blockMappings.get` on the mappings object and instead have to
  //       test unique identifiers all the way up the block chain.
  //       The deep clone issue passing mapping in through plugin options feels avoidable.
  let list: string[] = [];
  // TODO
  // mapping.blockMappings.forEach((l, o) => {
  //   if ( test && o.asSource() === test.asSource() && o.block.name === test.block.name ) { list = l; }
  // });
  return list.join(' ');
}

/**
 * Given a well formed Object String `CallExpression`, replace all BlockObject expressions
 * with the style mapping. If input is not a well formed Object String, skip silently.
 * @param mapping The current StyleMapping we are observing for access to scope.
 * @param path The Object String call's path object.
 * @returns The array of `Property` values passed to Object String
 */
function swapObjstrProps(mapping: StyleMapping, path: NodePath<any>) {

  // If this node is not a call expression (ex: `objstr({})`), or is a complex
  // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
  // short circuit and continue execution.
  let func = path.node;
  if ( !isCallExpression(path.node) || !isIdentifier(path.node.callee) ) {
    return;
  }

  // Fetch the function name. If we can't get the name, or the function is not in scope, throw
  let name = func.callee.name;
  let binding: Binding | undefined = path.scope.getBinding(name);
  if ( !binding ) {
    return;
  }

  // If this call expression is not an `objstr` call, or is in a form we don't
  // recognize (Ex: first arg is not an object), short circuit and continue execution.
  let funcDef = binding.path.parent;
  let isObjstr = isImportDeclaration(funcDef) && funcDef.source.value ===  OBJSTR_PACKAGE_NAME;
  if ( !isObjstr || !isObjectExpression(func.arguments[0]) ) {
    return;
  }

  // The object passed to objstr, and an array of all properties.
  let obj: ObjectExpression = func.arguments[0] as ObjectExpression;
  let props: ObjectProperty[] = obj.properties.filter(p => isObjectProperty(p)) as ObjectProperty[];

  // If no props, return. This should never happen, will throw in Analysis.
  if ( !props ) { return; }

  // For each property passed to objstr, parse the expression and attempt to save the style.
  props.forEach((prop: ObjectProperty) => {

    // Ignore non computed properties, they will never be blocks objects.
    if ( prop.computed === false ) {
      return;
    }

    // Get expression from computed property name.
    let parts: ExpressionReader = new ExpressionReader(prop.key, mapping);
    if ( !parts.concerns.length ) { return; }

    // If there is more than one BlockObject concern related to this expresison,
    // start the one to many objstr rewrite.
    // For each state in this state group, construct the logic expression using
    // the value passed into the CSS Block State "function" and the value of
    // the existing objstr property, and add to the objstr call.
    // Ex:
    //     objstr({
    //       [block.state(expr1)]: expr2
    //     })
    //
    //     transforms to
    //
    //     objstr({
    //       'block--state-substate1': expr1 === 'substate1' && expr2,
    //       'block--state-substate2': expr1 === 'substate2' && expr2
    //     })
    if ( parts.isDynamic ) {

      // Remove the old property.
      obj.properties.splice(obj.properties.indexOf(prop), 1);

      let condition1 = (prop.key as CallExpression).arguments[0];
      let condition2 = prop.value;

      if ( isSpreadElement(condition1) ) {
        throw new TemplateRewriteError(`The spread operator is not allowed in CSS Block states.`, {
          filename: 'TODO',
          line: condition1.loc.start.line,
          column: condition1.loc.start.column
        });
      }

      // If the condition inside our state call is more complicated than a simple
      // identifier, assign it to a new variable in scope and use it to construct
      // our binary expressions
      let conditionId: Identifier;
      if ( !isIdentifier(condition1) ) {
        conditionId = path.scope.generateUidIdentifier('condition');
        path.getStatementParent().insertBefore(variableDeclaration('const', [ variableDeclarator(conditionId, condition1) ]));
      }
      else {
        conditionId = condition1;
      }

      parts.concerns.forEach( (state) => {
        let className = getBlockObjectClassnames(mapping, state);

        if ( !className ) {
          throw new TemplateRewriteError(`No class name found for state "${state.asSource()}".`, {
            filename: 'TODO',
            line: prop.loc.start.line,
            column: prop.loc.start.column
          });
        }

        let expr1 = binaryExpression('===', conditionId, stringLiteral(state.name));

        // If the current objstr value expression is a simple, truthy, string or boolean,
        // we can skip adding it to our boolean expression.
        if ( ( isBooleanLiteral(condition2) || isStringLiteral(condition2) ) && condition2.value ){
          obj.properties.push(objectProperty( stringLiteral(className), expr1 ));
        }
        else {
          let expr2 = logicalExpression('&&', expr1, condition2);
          obj.properties.push(objectProperty( stringLiteral(className), expr2 ));
        }

      });
    }

    // If not a dynamic substate, simply replace with new string.
    else {
      let className = getBlockObjectClassnames(mapping, parts.concerns[0]);
      if ( className ) {
        prop.key = stringLiteral(className);
        prop.computed = false;
      }
    }

  });
}

export default function transform(): any {
  let filename = '';
  let mapping: StyleMapping;
  let cssBlockOptions: PluginOptionsReader;
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
        cssBlockOptions = state.opts.rewriter.cssBlockOptions;
        shouldProcess = !!(mapping && Object.keys(mapping.blocks).length);
      },

      // If this is a CSS Blocks import, always remove it.
      ImportDeclaration(nodepath: NodePath<ImportDeclaration>) {
        if ( isBlockFilename(nodepath.node.source.value) ) {
          nodepath.remove();
        }
      },

      // Find all objstr call expressions. Parse as though a single element's styles.
      CallExpression(path: NodePath<CallExpression>, state: any): void {

        if ( !shouldProcess ) {
          return;
        }

        swapObjstrProps(mapping, path);
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

            // If this attribute's value is not an expression, skip.
            if ( !isJSXExpressionContainer(value) ) { return; }

            // Discover identifiers we are concerned with. These include Block root
            // references and `objstr` references in scope that contain block objects.
            // ex: `blockname` || `objstrVar`
            if ( isIdentifier(value.expression) ) {

              let name = value.expression.name;

              // Check if there is a block of this name imported. If so, add style and exit.
              if ( mapping.blocks[name] ) {
                let block = mapping.blocks[name];
                let str = getBlockObjectClassnames(mapping, block);
                attr.value = stringLiteral(str);
                return;
              }

            }

            // Discover direct references to an imported block.
            // Ex: `blockName.foo` || `blockname['bar']` || blockname.foo()
            if ( isMemberExpression(value.expression) || isCallExpression(value.expression) ) {
              let expression: any = value.expression;
              let parts: ExpressionReader = new ExpressionReader(expression, mapping);

              // Replace with new string
              parts.concerns.forEach( (obj) => {
                let className = getBlockObjectClassnames(mapping, obj);
                if ( className ) { attr.value = stringLiteral(className); }
              });
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
