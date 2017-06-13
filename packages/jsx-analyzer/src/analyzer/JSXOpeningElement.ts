import Analysis from '../Analysis';
import { NodePath, Binding } from 'babel-traverse';
import { Block, BlockClass, State } from "css-blocks";
import { JSXOpeningElement,
         JSXAttribute,
         isJSXIdentifier,
         isJSXNamespacedName,
         isJSXMemberExpression,
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
function getObjstrProps(path: NodePath<any>, func: any) : Property[]{
  let props: Property[] = [];

  // If this node is not a call expression (ex: `objstr({})`), or is a complex
  // call expression that we'll have trouble analyzing (ex: `(true && objstr)({})`)
  // short circuit
  if ( !isCallExpression(func) || !isIdentifier(func.callee) ) {
    return props;
  }

  let name = func.callee.name;
  // If there is no `name` in scope, throw
  let binding: Binding | undefined = path.scope.getBinding(name);
  if ( !binding ) {
    throw new Error(`Variable "${name}" is undefined`);
  }
  let funcDef = binding.path.parent;
  let isObjstr = isImportDeclaration(funcDef) && funcDef.source.value ===  OBJSTR_PACKAGE_NAME;

  if ( !isObjstr || !isObjectExpression(func.arguments[0]) ) {
    return props;
  }

  return (<ObjectExpression>func.arguments[0]).properties;
}

/**
 * Given a `MemberExpression` object, or `Identifier`, return an array of all
 * expression identifiers. Ex: `foo.bar['baz']` => ['foo', 'bar', 'baz']. Return
 * empty array if input is not a valid type.
 * @param expression The expression in question.
 * @returns An array of strings representing the expression parts.
 */
function getExpressionParts(expression: any ): string[] {

  let parts: string[] = [];

  if ( !isMemberExpression(expression)    &&
       !isIdentifier(expression)          &&
       !isJSXMemberExpression(expression) &&
       !isJSXIdentifier(expression)
  ) {
    return parts;
  }

  function addPart(prop: any) { // Yes, any. We do explicit type checking here.
    if ( isIdentifier(prop) || isJSXIdentifier(prop) ) {
      parts.unshift(prop.name);
    }

    else if ( isStringLiteral(prop) ) {
      parts.unshift(prop.value);
    }

    else {
      // TODO: Add location data in error message.
      throw new Error('Cannot pass complex member expressions to attribute "class" on <name of element here>')
    }
  }

  // Crawl member expression adding each part we discover.
  while ( isMemberExpression(expression) || isJSXMemberExpression(expression) ) {
    let prop = expression.property;
    addPart(prop);
    expression = expression.object;
  }
  addPart(expression);

  return parts;
}

/**
 * Given an array of expression string identifiers, fetch the corrosponding Block
 * Object, validate its existence, and register it properly with our `Analytics`
 * reporter.
 * @param parts The array of strings representing expression identifiers.
 * @param analysis The Analysis object with Block data and to store our results in.
 * @param isDynamic If the style to save is dynamic.
 */
function addStyle(parts: string[] = [], analysis: Analysis, isDynamic: boolean = false): void {

  // Fetch selector parts and look for a block under the local name.
  let blockName: string | undefined = parts[0];
  let className: string | undefined = parts[1];

  // If nothing here, we don't care!
  if (parts.length === 0) {
    return;
  }

  // If there is no block imported under this local name, this is a class
  // we don't care about. Return.
  let block: Block | undefined = analysis.localBlocks[blockName];
  if ( !block ) {
    return;
  }

  // If we have discovered a block reference, but the user is referencing
  // something other than a class, throw.
  if ( parts.length > 2 ) {
    // TODO: Add location data in error message.
    throw new Error(`Attempted to access non-existant block class or state "${parts.join('.')}"`);
  }

  // If this is a block reference, fetch the class referenced in this selector.
  let classBlock: BlockClass | undefined = block.getClass(className);

  // If applying the root styles, either by `class="block.root"` or `class="block"`
  if ( className === 'root' || className === undefined ) {
    analysis.addStyle(block);
    if ( isDynamic ) {
      analysis.markDynamic(block);
    }
  }

  // If we found a class of the same name in this Block
  else if ( classBlock ) {
    analysis.addStyle(classBlock);
    if ( isDynamic ) {
      analysis.markDynamic(classBlock);
    }
  }

  // Otherwise throw a helpful error.
  else {
    throw new Error(`No class named "${className}" found on block "${blockName}"`)
  }
}


/**
 * Primary analytics parser for Babylon. Crawls all JSX Elements and their attributes
 * and saves all discovered block references. See README for valid JSX CSS Block APIs.
 * @param path The JSXOpeningElement Babylon path we are processing.
 */
export default function JSXOpeningElement(this: Analysis, path: NodePath<JSXOpeningElement>): void {

  let el = path.node;

  // We don't care about elements with no attributes;
  if ( !el.attributes || el.attributes.length === 0 ) {
    return;
  }

  this.startElement();

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
          let block: Block | undefined = this.localBlocks[name];
          if ( block ) {
            this.addStyle(block);
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

          let props: Property[] = getObjstrProps(path, objstr);
          if ( !props ) {
            throw new Error(`Class attribute value "${name}" must be either an "objstr" call, or a Block reference`);
          }

          props.forEach((prop: Property) => {

            // Ignore non computed properties, they will never be blocks objects.
            if ( !isObjectProperty(prop) || prop.computed === false ) {
              return;
            }

            // Get expression from computed property name.
            let parts: string[] = getExpressionParts(prop.key);
            addStyle(parts, this, !isLiteral(prop.value));

          });

        }

        if ( isCallExpression(value.expression) ) {

          let props: Property[] = getObjstrProps(path, value.expression);

          if ( !props ) {
            throw new Error(`Class attribute value "${name}" must be either an "objstr" call, or a Block reference`);
          }

          props.forEach((prop: Property) => {

            // Ignore non computed properties, they will never be blocks objects.
            if ( !isObjectProperty(prop) || prop.computed === false ) {
              return;
            }

            // Get expression from computed property name.
            let parts: string[] = getExpressionParts(prop.key);
            addStyle(parts, this, !isLiteral(prop.value));

          });
        }

        // Discover direct references to an imported block.
        // Ex: `blockName.foo` || `blockname['bar']`
        if ( isMemberExpression(value.expression) ) {
          let expression: any = value.expression;
          let parts: string[] = getExpressionParts(expression);
          addStyle(parts, this, false);
        }
      }
    }

    // Handle state attributes
    else if ( isJSXNamespacedName(property) ) {

      // Fetch selector parts and look for a block under the local name.
      let parts = getExpressionParts(property.namespace);
      let blockName: string | undefined = parts[0];
      let className: string | undefined = parts[1];
      let stateName: string = property.name.name;

      // If there is no block imported under this local name, this is a class
      // we don't care about. Return.
      let block: Block | undefined = this.localBlocks[blockName];
      if ( !block || !stateName ) {
        return;
      }

      // If this is a block reference, fetch the class referenced in this selector.
      let classBlock: BlockClass | undefined = block.getClass(className);

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
      if ( !states || parts.length > 2 ) {
        // TODO: Add location data in error message.
        throw new Error(`Attempted to access non-existant state "${stateName}" on block class namespace "${parts.join('.')}"`);
      }

      // Register all states with our analysis
      states.forEach((state: State) => {
        this.addStyle(state);
        if ( isDynamic ) {
          this.markDynamic(state);
        }
      });

    }
  });

  this.endElement();
}
