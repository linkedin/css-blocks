import Analysis from '../utils/Analysis';
import { NodePath, Binding } from 'babel-traverse';
import { Block, BlockClass, State } from 'css-blocks';
import { ExpressionReader } from '../utils/ExpressionReader';
import { JSXOpeningElement,
         JSXAttribute,
         isJSXIdentifier,
         isJSXNamespacedName,
         isMemberExpression,
         isJSXExpressionContainer,
         isStringLiteral,
         isIdentifier,
         isVariableDeclarator,
         isCallExpression,
         isObjectExpression,
         ObjectProperty,
         isObjectProperty,
         SpreadProperty,
         ObjectMethod,
         ObjectExpression,
         isImportDeclaration,
         isLiteral
       } from 'babel-types';

const OBJSTR_PACKAGE_NAME = 'obj-str';
const STATE_NAMESPACE = 'state';

// Properties to check for block classes applied
const CLASS_PROPERTIES = {
  'class': 1,
  'className': 1
};

type Property = ObjectProperty | SpreadProperty | ObjectMethod;

/**
 * Given a well formed Object String `CallExpression`, return the Array of `Property`
 * objects passed to it. If input is not a well formed Object String, return empty array.
 * @param path The current Path we are observing for access to scope.
 * @param fund The suspected Object String `CallExpression` to process.
 * @returns The array of `Property` values passed to Object String
 */
function saveObjstrProps(analysis: Analysis, path: NodePath<any>, func: any) {
  let props: Property[] = [];

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

  props = (<ObjectExpression>func.arguments[0]).properties;

  if ( !props ) {
    throw new Error(`Class attribute value "${name}" must be either an "objstr" call, or a Block reference`);
  }

  // For each property passed to objstr, parse the expression and attempt to save the style.
  props.forEach((prop: Property) => {

    // Ignore non computed properties, they will never be blocks objects.
    if ( !isObjectProperty(prop) || prop.computed === false ) {
      return;
    }

    // Get expression from computed property name.
    let parts: ExpressionReader = new ExpressionReader(prop.key);
    saveStyle(parts, analysis, !isLiteral(prop.value));

  });
}

/**
 * Given an array of expression string identifiers, fetch the corrosponding Block
 * Object, validate its existence, and register it properly with our `Analytics`
 * reporter.
 * @param parts The array of strings representing expression identifiers.
 * @param analysis The Analysis object with Block data and to store our results in.
 * @param isDynamic If the style to save is dynamic.
 */
function saveStyle(reader: ExpressionReader, analysis: Analysis, isDynamic = false): void {
  let part: string | undefined;
  let blockName: string | undefined;
  let className: string | undefined;
  let stateName: string | undefined;
  let substateName: string | undefined;

  // If nothing here, we don't care!
  if ( reader.length === 0 ) {
    return;
  }

  while ( part = reader.next() ){
    if ( !blockName ) {
      blockName = part;
    }
    else if ( analysis.template.localStates[blockName] === part ) {
      stateName = reader.next();
      substateName = reader.next();
    }
    else if ( !className ) {
      className = part;
    }
    // If the user is referencing something deeper than allowed, throw.
    else {
      throw new Error(`Attempted to access non-existant block class or state "${reader.toString()}"`);
    }
  }

  // If there is no block imported under this local name, this is a class
  // we don't care about. Return.
  let block: Block | undefined = blockName ? analysis.blocks[blockName] : undefined;
  if ( !block ) {
    return;
  }

  // If applying the root styles, either by `class="block.root"` or `class="block"`
  if ( className === 'root' || ( !className ) ) {

    if ( stateName ) {
      let stateBlocks: State[] = block.states.getGroup(stateName, substateName);
      if ( !stateBlocks.length ){
        throw new Error(`No state named "${stateName}${substateName ? '='+substateName : ''}" found on block "${block.name}"`);
      }
      stateBlocks.forEach((stateBlock: State) => {
        analysis.addStyle(stateBlock, isDynamic);
      });
    }
    else {
      analysis.addStyle(block, isDynamic);
    }
  }

  // Otherwise, fetch the class referenced in this selector. If it exists, add.
  else {
    let classBlock: BlockClass | undefined = className ? block.getClass(className) : undefined;
    if ( !classBlock ){
      throw new Error(`No class named "${className}" found on block "${blockName}"`);
    }

    if ( stateName ) {
      let stateBlocks: State[] = classBlock.states.getGroup(stateName, substateName);

      if ( !stateBlocks.length ){
        throw new Error(`No state "${stateName}${substateName ? '='+substateName : ''}" found on class "${className}" in block "${block.name}"`);
      }
      stateBlocks.forEach((stateBlock: State) => {
        analysis.addStyle(stateBlock, isDynamic);
      });
    }
    else {
      analysis.addStyle(classBlock, isDynamic);
    }
  }
}

// Consolidate all visitors into a hash that we can pass to `babel-traverse`
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

      analysis.startElement();

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
              let block: Block | undefined = analysis.blocks[name];
              if ( block ) {
                analysis.addStyle(block);
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
              saveObjstrProps(analysis, path, objstr);

            }

            // If we discover an inlined call expression, assume it is an objstr call
            // until proven otherwise. Fails silently and continues with execution if is not.
            if ( isCallExpression(value.expression) ) {
              saveObjstrProps(analysis, path, value.expression);
            }

            // Discover direct references to an imported block.
            // Ex: `blockName.foo` || `blockname['bar']`
            if ( isMemberExpression(value.expression) ) {
              let expression: any = value.expression;
              let parts: ExpressionReader = new ExpressionReader(expression);
              saveStyle(parts, analysis, false);
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
          let block: Block | undefined = (blockName) ? analysis.blocks[blockName] : undefined;
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
            analysis.addStyle(state, isDynamic);
          });

        }
      });

      analysis.endElement();
    }
  };
}
