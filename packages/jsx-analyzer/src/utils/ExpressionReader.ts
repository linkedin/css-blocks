const PATH_START = Symbol('path-start');
const PATH_END   = Symbol('path-end');
const isValidSegment = /^[a-z|A-Z|_|$][a-z|A-Z|_|$|1-9]*$/;
export type PathExpression = (string|symbol)[];
import { isJSXIdentifier,
         isJSXMemberExpression,
         isMemberExpression,
         isStringLiteral,
         isIdentifier
       } from 'babel-types';

export class ExpressionReader {
  private expression: PathExpression;
  private index = 0;

  constructor(expression: any){
    this.expression = getExpressionParts(expression);
  }
  get length() {
    return this.expression.length;
  }
  next(): string | undefined {
    let next = this.expression[this.index++];
    if (next === PATH_START) return this.next();
    if (next === PATH_END) return this.next();
    return <string>next;
  }
  toString() {
    let out = '';
    this.expression.forEach((part, idx) => {
      if (idx === 0 || idx === this.expression.length-1) {
        return;
      }
      if (part === PATH_START) {
        out += '[';
      }
      else if (part === PATH_END) {
        out += ']';
      }
      else if ( isValidSegment.test(<string>part) ) {
        out += (!out || out[out.length-1] === '[') ? <string>part : '.'+<string>part;
      }
      else {
        out += '[\''+<string>part+'\']';
      }
    });
    return out;
  }
}

/**
 * Given a `MemberExpression` object, or `Identifier`, return an array of all
 * expression identifiers.
 * Ex: `foo.bar['baz']` => ['foo', 'bar', 'baz']
 * EX: `foo.bar[biz.baz].bar` => ['foo', 'bar', ['biz', 'baz'], 'bar']
 * Return empty array if input is invalid nested expression.
 * @param expression The expression in question. Yes, any. We're about to do some very explicit type checking here.
 * @returns An array of strings representing the expression parts.
 */
function getExpressionParts(expression: any ): PathExpression {

  let parts: PathExpression = [];

  if ( !isMemberExpression(expression)    &&
       !isIdentifier(expression)          &&
       !isJSXMemberExpression(expression) &&
       !isJSXIdentifier(expression)
  ) {
    return parts;
  }

  // Yes, any. We must do very explicit type checking here.
  function addPart(expression: any, prop: any) {
    if ( isIdentifier(prop) || isJSXIdentifier(prop) ) {
      parts.unshift(prop.name);
    }

    else if ( isStringLiteral(prop) ) {
      parts.unshift(prop.value);
    }

    // If we encounter anoter member expression (Ex: foo[bar.baz])
    // Because Typescript has issues with recursively nested types, we use booleans
    // to denote the boundaries between nested expressions.
    else if ( expression.computed && (
              isMemberExpression(prop)    ||
              isJSXMemberExpression(prop) ||
              isJSXIdentifier(prop)       ||
              isIdentifier(prop)
            )) {
      parts.unshift.apply(parts, getExpressionParts(prop));
    }

    else {
      // TODO: Add location data in error message.
      throw new Error('Cannot parse overly complex expression to reference a CSS Block.');
    }
  }

  // Crawl member expression adding each part we discover.
  parts.unshift(PATH_END);
  while ( isMemberExpression(expression) || isJSXMemberExpression(expression) ) {
    let prop = expression.property;
    addPart(expression, prop);
    expression = expression.object;
  }
  addPart(expression, expression);
  parts.unshift(PATH_START);

  return parts;
}
