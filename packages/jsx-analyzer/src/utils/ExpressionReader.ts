import { ObjectDictionary, objectValues } from '@opticss/util';
import * as debugGenerator from 'debug';
import { Block, BlockClass, State, isBlockClass } from 'css-blocks';
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
  StringLiteral,
  NumericLiteral,
  BooleanLiteral,
  Expression,
  CallExpression,
} from 'babel-types';

import { MalformedBlockPath, ErrorLocation } from '../utils/Errors';

const debug = debugGenerator('css-blocks:jsx');

const isValidSegment = /^[a-z|A-Z|_|$][a-z|A-Z|_|$|1-9]*$/;

const PATH_START    = Symbol('path-start');
const PATH_END      = Symbol('path-end');
const CALL_START    = Symbol('call-start');
const CALL_END      = Symbol('call-end');

export const DYNAMIC_STATE_ID = '*';

export type PathExpression = (string|symbol)[];

function isLiteral(node: Node): node is StringLiteral | NumericLiteral | BooleanLiteral  {
  return isStringLiteral(node) || isNumericLiteral(node) || isBooleanLiteral(node);
}

function hasLiteralArguments(args: Array<Node>, length: number): boolean {
  return args.length === length && args.every(a => isLiteral(a));
}

export type BlockClassResult = {
  block: Block;
  blockClass?: BlockClass;
};
export type BlockStateResult = BlockClassResult & {
  state: State;
};
export type BlockStateGroupResult = BlockClassResult & {
  stateGroup: ObjectDictionary<State>;
  dynamicStateExpression: Expression;
};
export type BlockExpressionResult = BlockClassResult
                                  | BlockStateResult
                                  | BlockStateGroupResult;

export function isBlockStateResult(result: BlockExpressionResult): result is BlockStateResult {
  return !!((<BlockStateResult>result).state);
}
export function isBlockStateGroupResult(result: BlockExpressionResult): result is BlockStateGroupResult {
  return !!((<BlockStateGroupResult>result).stateGroup);
}

/**
 * The reader does a first pass at construction time to decide if the expression is of the correct syntactic form to be
 * a block expression. Checking `isBlockExpression` after construction lets the caller decide if
 * she wants to go on to convert to a block object by calling `getResult(localBlocks)`.
 */
export class ExpressionReader {
  private pathExpression: PathExpression;
  private callExpression: CallExpression | undefined;

  isBlockExpression: boolean;
  block: string | undefined;
  class: string | undefined;
  state: string | undefined;
  subState: string | undefined;
  isDynamic: boolean;
  err: null | string = null;
  loc: ErrorLocation;

  constructor(expression: Node, filename: string){

    // Expression location info object for error reporting.
    this.loc = {
      filename,
      line: expression.loc.start.line,
      column: expression.loc.start.column
    };

    this.pathExpression = parsePathExpression(expression, this.loc);

    // Register if this expression's sub-state is dynamic or static.
    if (isCallExpression(expression)) {
      this.callExpression = expression;
      this.isDynamic = !hasLiteralArguments(expression.arguments, 1);
      if (expression.arguments.length > 1) {
        this.isBlockExpression = false;
        this.isDynamic = false;
        this.err = 'Only one argument can be supplied to a dynamic state';
        return;
      }
    }

    if (this.pathExpression.length < 3) {
      this.isBlockExpression = false;
      return;
    }

    // Discover block expression identifiers of the form `block[.class][.state([subState])]`
    for ( let i = 0; i < this.pathExpression.length; i++ ) {

      if ( this.err ) {
        this.block = this.class = this.state = this.subState = undefined;
        break;
      }

      let token = this.pathExpression[i];
      let next = this.pathExpression[i+1];

      if ( token === PATH_START && this.block ) {
        // XXX This err appears to be completely swallowed?
        debug(`Discovered invalid block expression ${this.toString()} in objstr`);
        this.err = 'Nested expressions are not allowed in block expressions.';
      }
      else if ( token === CALL_START && !this.state ) {
        // XXX This err appears to be completely swallowed?
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

    this.isBlockExpression = !this.err && !!this.block;
  }

  /**
   * This turns the strings that represent the block, class, state and substate
   * into a BlockObject. It is only valid to call when `isBlockExpression`
   * is true.
   *
   * localBlocks is a dictionary of local block names to the Block.
   */
  getResult(localBlocks: ObjectDictionary<Block>): BlockExpressionResult {
    // TODO: Consider whether some parts of this lookup can be extracted to
    // css-blocks proper so that errors and logic are consistent.

    if (!this.isBlockExpression) {
      if (this.err) {
          throw new MalformedBlockPath(this.err, this.loc);
      } else {
          throw new MalformedBlockPath('No block name specified.', this.loc);
      }
    }
    let block = localBlocks[this.block!];
    let blockClass: BlockClass | undefined = undefined;
    if (!block) {
      throw new MalformedBlockPath(`No block named ${this.block} exists in this scope.`, this.loc);
    }

    // Fetch the class referenced in this selector, if it exists.
    if ( this.class && this.class !== 'root' ) {
      blockClass = block.lookup(`.${this.class}`) as BlockClass | undefined;
      if ( !blockClass ) {
        let knownClasses = block.all(false).filter(s => isBlockClass(s)).map(c => c.asSource());
        throw new MalformedBlockPath(`No class named "${this.class}" found on block "${this.block}". ` +
          `Did you mean one of: ${knownClasses.join(', ')}`, this.loc);
      }
    }

    // If no state, we're done!
    if ( !this.state ) {
      debug(`Discovered BlockClass ${this.class} from expression ${this.toString()}`);
      return { block, blockClass };
    }
    let statesContainer = (blockClass || block).states;

    // Fetch all matching state objects.
    let stateGroup = statesContainer.resolveGroup(this.state, this.subState !== DYNAMIC_STATE_ID ? this.subState : undefined) || {};
    let stateNames = Object.keys(stateGroup);
    if (stateNames.length > 1 && this.subState !== DYNAMIC_STATE_ID) {
      throw new MalformedBlockPath(`State ${this.toString()} expects a sub-state.`, this.loc);
    }

    // Throw a helpful error if this state / sub-state does not exist.
    if ( stateNames.length === 0 ) {
      let allSubStates = statesContainer.resolveGroup(this.state) || {};
      let knownStates = objectValues(allSubStates);
      let message = `No state [state|${this.state}${this.subState ? '='+this.subState : ''}] found on block "${this.block}".`;
      if (knownStates.length === 1) {
        message += `\n  Did you mean: ${knownStates[0].asSource()}?`;
      } else if (knownStates.length > 0) {
        message += `\n  Did you mean one of: ${knownStates.map(s => s.asSource()).join(', ')}?`;
      }
      throw new MalformedBlockPath(message, this.loc);
    }

    debug(`Discovered ${this.class ? 'class-level' : 'block-level'} state ${this.state} from expression ${this.toString()}`);

    if (this.subState === DYNAMIC_STATE_ID) {
      return { block, blockClass, stateGroup, dynamicStateExpression: this.callExpression!.arguments[0] };
    } else {
      return { block, blockClass, state: objectValues(stateGroup)[0] };
    }
  }

  toString() {
    let out = '';
    let len = this.pathExpression.length;
    this.pathExpression.forEach((part, idx) => {

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
 * Ex: `foo.bar['baz']` => [Symbol('path-start'), 'foo', 'bar', 'baz', Symbol('path-end')]
 * EX: `foo.bar[biz.baz].bar` => [Symbol('path-start'), 'foo', 'bar', Symbol('path-start'), 'biz', 'baz', Symbol('path-end'), 'bar', Symbol('path-end')]
 * Return empty array if input is invalid nested expression.
 * @param expression The expression node to be parsed
 * @returns An array of strings representing the expression parts.
 */
function parsePathExpression(expression: Node, loc: ErrorLocation): PathExpression {

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
    // Because Typescript has issues with recursively nested types, we use symbols
    // to denote the boundaries between nested expressions.
    else if ( expression.computed && (
              isCallExpression(prop)      ||
              isMemberExpression(prop)    ||
              isJSXMemberExpression(prop) ||
              isJSXIdentifier(prop)       ||
              isIdentifier(prop)
            )) {
      parts.unshift(...parsePathExpression(prop, loc));
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
      if ( isLiteral(part) ) {
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
