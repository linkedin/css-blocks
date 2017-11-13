import * as debugGenerator from 'debug';
import { BlockObject, Block, BlockClass, State, StyleMapping } from 'css-blocks';
import { Node } from 'babel-traverse';
import {
  isCallExpression,
  isJSXIdentifier,
  isJSXMemberExpression,
  isMemberExpression,
  isStringLiteral,
  isBooleanLiteral,
  isIdentifier,
  isNumericLiteral,
  StringLiteral
} from 'babel-types';

import Analysis from './Analysis';
import { MalformedBlockPath, ErrorLocation } from '../utils/Errors';

const debug = debugGenerator('css-blocks:jsx');

const isValidSegment = /^[a-z|A-Z|_|$][a-z|A-Z|_|$|1-9]*$/;

const PATH_START    = Symbol('path-start');
const PATH_END      = Symbol('path-end');
const CALL_START    = Symbol('call-start');
const CALL_END      = Symbol('call-start');

export const DYNAMIC_STATE_ID = '*';

export type PathExpression = (string|symbol)[];

function isLiteralPart(part: Node) {
  return isStringLiteral(part) || isNumericLiteral(part) || isBooleanLiteral(part);
}

export class ExpressionReader {
  private expression: PathExpression;
  private index = 0;

  isBlockExpression: boolean;
  block: string | undefined;
  class: string | undefined;
  state: string | undefined;
  subState: string | undefined;
  isDynamic: boolean;
  concerns: BlockObject[] = [];
  err: null | string = null;

  constructor(expression: Node, analysis: Analysis | StyleMapping){

    // Expression location info object for error reporting.
    let loc: ErrorLocation = {
      filename: 'TODO',
      line: expression.loc.start.line,
      column: expression.loc.start.line
    };

    this.expression = getExpressionParts(expression, loc);

    // Register if this expression's sub-state is dynamic or static.
    if ( isCallExpression(expression) && expression.arguments[0] && !isLiteralPart(expression.arguments[0])) {
      this.isDynamic = true;
    }
    else {
      this.isDynamic = false;
    }

    let len = this.expression.length;

    // Discover block expression identifiers of the form `block[.class][.state([subState])]`
    for ( let i=0; i<len; i++ ) {

      if ( this.err ) {
        this.block = this.class = this.state = this.subState = undefined;
        break;
      }

      let token = this.expression[i];
      let next = this.expression[i+1];

      if ( token === PATH_START && this.block ) {
        debug(`Discovered invalid block expression ${this.toString()} in objstr`);
        this.err = 'Nested expressions are not allowed in block expressions.';
      }
      else if ( token === CALL_START && !this.state ) {
        debug(`Discovered invalid block expression ${this.toString()} in objstr`);
        this.err = 'Can not select state without a block or class.';
      }
      else if ( typeof token === 'string' ) {
        if      ( this.state ) { this.subState = token; }
        else if ( this.class ) { this.state = token; }
        else if ( this.block && next === CALL_START ) { this.state = token; }
        else if ( this.block ) { this.class = token; }
        else { this.block = token; }
      }
    }

    this.isBlockExpression = !!len && !this.err && !!this.block;

    // Fetch the specified block. If no block found, fail silently.
    if ( !this.block ) { return; }
    let blockObj: Block | BlockClass = analysis.blocks[this.block];
    if ( !blockObj ) {
      debug(`Discovered Block ${this.block} from expression ${this.toString()}`);
      return;
    }

    // Fetch the class referenced in this selector, if it exists.
    if ( this.class && this.class !== 'root' ) {
      let classObj: BlockClass | undefined;
      classObj = (blockObj as Block).getClass(this.class);
      if ( !classObj ) {
        throw new MalformedBlockPath(`No class named "${this.class}" found on block "${this.block}"`, loc);
      }
      blockObj = classObj;
    }

    // If no state, we're done!
    if ( !this.state ) {
      debug(`Discovered BlockClass ${this.class} from expression ${this.toString()}`);
      this.concerns.push(blockObj);
      return;
    }

    // Throw an error if this state expects a sub-state and nothing has been provided.
    let states = blockObj.states.resolveGroup(this.state) || {};
    if (  Object.keys(states).length > 1 && this.subState === undefined ) {
      throw new MalformedBlockPath(`State ${this.toString()} expects a sub-state.`, loc);
    }

    // Fetch all matching state objects.
    let stateObjects = blockObj.states.resolveGroup(this.state, this.subState !== DYNAMIC_STATE_ID ? this.subState : undefined) || {};

    // Throw a helpful error if this state / sub-state does not exist.
    if ( !Object.keys(stateObjects).length ) {
      let knownStates: State[] | undefined;
      let allSubStates = blockObj.states.resolveGroup(this.state) || {};
      if (allSubStates) {
        let ass = allSubStates;
        knownStates = Object.keys(allSubStates).map(k => ass[k]);
      }
      let message = `No state [state|${this.state}${this.subState ? '='+this.subState : ''}] found on block "${this.block}".`;
      if (knownStates) {
        if (knownStates.length === 1) {
          message += `\n  Did you mean: ${knownStates[0].asSource()}?`;
        } else {
          message += `\n  Did you mean one of: ${knownStates.map(s => s.asSource()).join(', ')}?`;
        }
      }
      throw new MalformedBlockPath(message, loc);
    }

    debug(`Discovered ${this.class ? 'class-level' : 'block-level'} state ${this.state} from expression ${this.toString()}`);

    // Push all discovered state / sub-state objects to BlockObject concerns list.
    ([]).push.apply(this.concerns, (<any>Object).values(stateObjects));
  }

  get length() {
    return this.expression.length;
  }

  next(): string | undefined {
    let next = this.expression[this.index++];
    if (next === PATH_START) return this.next();
    if (next === PATH_END) return this.next();
    if (next === CALL_START) return this.next();
    if (next === CALL_END) return this.next();
    return <string>next;
  }

  reset(): void {
    this.index = 0;
  }

  toString() {
    let out = '';
    let len = this.expression.length;
    this.expression.forEach((part, idx) => {

      // If the first or last character, skip. These will always be path start/end symbols.
      if ( idx === 0 || idx === len-1 ) { return; }

      // Print special characters
      if      ( part === PATH_START )    { out += '['; }
      else if ( part === PATH_END )      { out += ']'; }
      else if ( part === CALL_START )    { out += '('; }
      else if ( part === CALL_END )      { out += ')'; }
      else if ( part === DYNAMIC_STATE_ID ) { out += '*'; }

      // Else, if a segment that doesn't require bracket syntax, print with proper leading `.`
      else if ( isValidSegment.test(<string>part) ) {
        out += (!out || out[out.length-1] === '[' || out[out.length-1] === '(') ? <string>part : '.'+<string>part;
      }

      // Else print with bracket syntax
      else {
        out += `['${<string>part}]`;
      }
    });

    return out;
  }
}

/**
 * Given a `MemberExpression`, `Identifier`, or `CallExpression`, return an array
 * of all expression identifiers.
 * Ex: `foo.bar['baz']` => ['foo', 'bar', 'baz']
 * EX: `foo.bar[biz.baz].bar` => ['foo', 'bar', ['biz', 'baz'], 'bar']
 * Return empty array if input is invalid nested expression.
 * @param expression The expression in question. Yes, any. We're about to do some
 * very explicit type checking here.
 * @returns An array of strings representing the expression parts.
 */
function getExpressionParts(expression: Node, loc: ErrorLocation): PathExpression {

  let parts: PathExpression = [];
  let args: Node[] | undefined;

  // If this is a call expression, unwrap the callee and arguments. Validation
  // on callee expression performed below. Arguments validated and added to parts
  // list at end.
  if ( isCallExpression(expression) ) {
    args = expression.arguments;
    expression = expression.callee;
  }

  // Validate we have an expression or identifier we can work with.
  if ( !isMemberExpression(expression)    &&
       !isIdentifier(expression)          &&
       !isJSXMemberExpression(expression) &&
       !isJSXIdentifier(expression)
  ) {
    return parts;
  }

  // Yes, any. We must do very explicit type checking here.
  function addPart(expression: any, prop: Node, loc: ErrorLocation) {
    if ( isIdentifier(prop) || isJSXIdentifier(prop) ) {
      parts.unshift(prop.name);
    }

    else if ( isStringLiteral(prop) ) {
      parts.unshift(prop.value);
    }

    // If we encounter another member expression (Ex: foo[bar.baz])
    // Because Typescript has issues with recursively nested types, we use booleans
    // to denote the boundaries between nested expressions.
    else if ( expression.computed && (
              isCallExpression(prop)      ||
              isMemberExpression(prop)    ||
              isJSXMemberExpression(prop) ||
              isJSXIdentifier(prop)       ||
              isIdentifier(prop)
            )) {
      parts.unshift.apply(parts, getExpressionParts(prop, loc));
    }

    else {
      // TODO: Add location data in error message.
      throw new MalformedBlockPath('Cannot parse overly complex expression to reference a CSS Block.', loc);
    }
  }

  // Crawl member expression adding each part we discover.
  while ( isMemberExpression(expression) || isJSXMemberExpression(expression) ) {
    let prop = expression.property;
    addPart(expression, prop, loc);
    expression = expression.object;
  }
  addPart(expression, expression, loc);
  parts.unshift(PATH_START);

  if ( args ) {
    parts.push(CALL_START);
    args.forEach((part) => {
      if ( isLiteralPart(part) ) {
        parts.push(String((part as StringLiteral).value));
      }
      else {
        parts.push(DYNAMIC_STATE_ID);
      }
    });
    parts.push(CALL_END);
  }
  parts.push(PATH_END);

  return parts;
}
