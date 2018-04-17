import { BlockPathError, ErrorLocation } from "../errors";

import {
  ATTR_PRESENT,
  CLASS_NAME_IDENT as CSS_IDENT,
  ROOT_CLASS,
  STATE_NAMESPACE,
} from "./BlockSyntax";

interface BlockToken {
  type: "block";
  name: string;
}

interface ClassToken {
  type: "class";
  name: string;
}

export interface IAttrToken {
  namespace?: string;
  name: string;
  value: string;
}

export interface AttrToken extends IAttrToken {
  type: "attribute";
  quoted: boolean;
}

type Token = BlockToken | ClassToken | AttrToken;

const isBlock = (token?: Partial<Token>): token is BlockToken => !!token && token.type === "block";
const isClass = (token?: Partial<Token>): token is ClassToken => !!token && token.type === "class";
const isAttribute = (token?: Partial<Token>): token is AttrToken  => !!token && token.type === "attribute";
const isQuoted = (token?: Partial<AttrToken>): boolean => !!token && !!token.quoted;
const isIdent = (ident?: string): boolean => !ident || CSS_IDENT.test(ident);
const hasName = (token?: Partial<Token>): boolean => !!token && !!token.name;
const isValidNamespace = (token?: Partial<AttrToken>): boolean => !!token && (token.namespace === undefined || token.namespace === STATE_NAMESPACE);

const ATTR_BEGIN = "[";
const ATTR_END = "]";
const CLASS_BEGIN = ".";
const NAMESPACE_END = "|";
const VALUE_START = "=";
const SINGLE_QUOTE = `'`;
const DOUBLE_QUOTE = `"`;
const PSEUDO_BEGIN = ":";
const WHITESPACE_REGEXP = /\s/g;
const SEPARATORS = new Set([CLASS_BEGIN, ATTR_BEGIN, PSEUDO_BEGIN]);

export const ERRORS = {
  whitespace: "Whitespace is only allowed in quoted attribute values",
  namespace: "State attribute selectors are required to use a valid namespace.",
  noname: "Block path segments must include a valid name",
  unclosedAttribute: "Unclosed attribute selector",
  mismatchedQuote: "No closing quote found in Block path",
  invalidIdent: (i: string) => `Invalid identifier "${i}" found in Block path.`,
  expectsSepInsteadRec: (c: string) => `Expected separator tokens "[" or ".", instead found \`${c}\``,
  illegalCharNotInAttribute: (c: string) => `Only attribute selectors may contain the \`${c}\` character.`,
  illegalCharInAttribute: (c: string) => `Attribute selectors may not contain the \`${c}\` character.`,
  multipleOfType: (t: string) => `Can not have more than one ${t} selector in the same Block path`,
};

function stringify(tokens: Token[]): string {
  let out = "";
  for (let token of tokens) {
         if (isBlock(token)) { out += token.name; }
    else if (isClass(token)) { out += token.name === ROOT_CLASS ? token.name : `.${token.name}`; }
    else if (isAttribute(token)) {
      let namespace = token.namespace ? `${token.namespace}|` : "";
      let value = token.value && token.value !== ATTR_PRESENT ? `="${token.value}"` : "";
      out += `[${namespace}${token.name}${value}]`;
    }
  }
  return out;
}

/**
 * Simple utility to easily walk over string data one character at a time.
 */
class Walker {
  private data = "";
  private length = 0;
  private idx = 0;

  init(data: string) {
    this.data = data;
    this.length = data.length;
    this.idx = 0;
  }

  next(): string { return this.data[this.idx++]; }
  peek(): string { return this.data[this.idx]; }
  index(): number { return this.idx; }

  /**
   * Consume all characters that do not match the provided Set or strings
   * and return the discovered value.
   * @param stop  A Set of strings, or arguments list of strings, that will halt character ingestion.
   */
  consume(stop: string | Set<string>, ...args: string[]): string {
    let out = "";
    stop = typeof stop === "string" ? new Set([stop, ...args]) : stop;
    while (!stop.has(this.data[this.idx]) && this.idx <= this.length - 1) {
      out += this.data[this.idx++];
    }
    return out;
  }

}

/**
 * Parser and container object for Block Path data.
 */
export class BlockPath {
  private _location?: ErrorLocation;
  private _block?: BlockToken;
  private _class?: ClassToken;
  private _attribute?: AttrToken;

  private walker: Walker = new Walker();
  private _tokens: Token[] = [];
  private parts: Token[] = [];

  public readonly original: string;

  /**
   * Throw a new BlockPathError with the given message.
   * @param msg The error message.
   */
  private throw(msg: string, len = 0): never {
    let location;
    if (this._location) {
      location = {
        ...this._location,
        column: (this._location.column || 0) + this.walker.index() - len,
      };
    }
    throw new BlockPathError(msg, location);
  }

  /**
   * Used by `tokenize` to insert a newly constructed token.
   * @param token The token to insert.
   */
  private addToken(token: Partial<Token>, isUserProvided: boolean): void {

    if (!token.type) { return; }

    // Final validation of incoming data. Blocks may have no name. State attribute must have a namespace.
    if (!isBlock(token) && !hasName(token)) { this.throw(ERRORS.noname); }
    if (isAttribute(token) && !isValidNamespace(token)) { this.throw(ERRORS.namespace); }

    // Ensure we only have a single token of each type per block path.
    if (isBlock(token)) {
      this._block = this._block ? this.throw(ERRORS.multipleOfType(token.type)) : token;
    }
    if (isClass(token)) {
      this._class = this._class ? this.throw(ERRORS.multipleOfType(token.type)) : token;
      // If no block has been added yet, automatically inject the `self` block name.
      if (!this._block) { this.addToken({ type: "block", name: "" }, false); }
    }
    if (isAttribute(token)) {
      this._attribute = this._attribute ? this.throw(ERRORS.multipleOfType(token.type)) : token;
      // If no class has been added yet, automatically inject the root class.
      if (!this._class) { this.addToken({ type: "class", name: ROOT_CLASS }, false); }
    }

    // Add the token.
    if (isUserProvided) { this._tokens.push(token as Token); }
    this.parts.push(token as Token);
  }

  /**
   * Given a Block Path string, convert it into tokens. Throw
   * with a helpful error if we encounter invalid Block Path syntax.
   * @param str The Block Path string.
   */
  private tokenize(): void {
    let char,
        working = "",
        walker = this.walker,
        token: Partial<Token> | undefined = { type: "block" };

    while (char = walker.next()) {

      switch (true) {

        case char === PSEUDO_BEGIN:
          if (!isBlock(token)) { return this.throw(ERRORS.invalidIdent(PSEUDO_BEGIN), working.length); }
          token.name = working;
          this.addToken(token, true);
          working = `${PSEUDO_BEGIN}${walker.consume(SEPARATORS)}`;
          if (working === ROOT_CLASS) {
            this.addToken({ type: "class", name: ROOT_CLASS }, true);
            working = "";
            token = {};
            break;
          }
          else {
            return this.throw(ERRORS.invalidIdent(working), working.length);
          }

        // If a period, we've finished the previous token and are now building a class name.
        case char === CLASS_BEGIN:
          if (isAttribute(token)) { this.throw(ERRORS.illegalCharInAttribute(char)); }
          if (!isIdent(working)) { return this.throw(ERRORS.invalidIdent(working), working.length); }
          token.name = working;
          this.addToken(token, true);
          token = { type: "class" };
          working = "";
          break;

        // If the beginning of a attribute, we've finished the previous token and are now building an attribute.
        case char === ATTR_BEGIN:
          if (isAttribute(token)) { this.throw(ERRORS.illegalCharInAttribute(char)); }
          if (!isIdent(working)) { return this.throw(ERRORS.invalidIdent(working), working.length); }
          token.name = working;
          this.addToken(token, true);
          token = { type: "attribute" };
          working = "";
          break;

        // When we find a namespace terminator, set the namespace property of the attribute token we're working on.
        case char === NAMESPACE_END:
          if (!isAttribute(token)) { return this.throw(ERRORS.illegalCharNotInAttribute(char)); }
          if (!isIdent(working)) { return this.throw(ERRORS.invalidIdent(working), working.length); }
          token.namespace = working;
          working = "";
          break;

        // If the start of the value section of an attribute token, set the name we've been working on and move on.
        case char === VALUE_START:
          if (!isAttribute(token)) { this.throw(ERRORS.illegalCharNotInAttribute(char)); }
          if (!working) { this.throw(ERRORS.noname); }
          if (!isIdent(working)) { return this.throw(ERRORS.invalidIdent(working), working.length); }
          token.name = working;
          working = "";
          break;

        // If the opening quote of the value section of an attribute token, greedily consume everything between quotes.
        case char === SINGLE_QUOTE || char === DOUBLE_QUOTE:
          if (!isAttribute(token)) { return this.throw(ERRORS.illegalCharNotInAttribute(char)); }
          working = walker.consume(char);
          token.quoted = true;
          if (walker.peek() !== char) { this.throw(ERRORS.mismatchedQuote); }
          walker.next(); // Throw away the other quote
          break;

        // If the end of an attribute, set the attribute token we've been working on and finish.
        case char === ATTR_END:
          if (!isAttribute(token)) { return this.throw(ERRORS.illegalCharNotInAttribute(char)); }
          if ((!hasName(token) || !isQuoted(token)) && !isIdent(working)) {
            return this.throw(ERRORS.invalidIdent(working), working.length);
          }
          (hasName(token)) ? (token.value = working) : (token.name = working);
          token.value = token.value || ATTR_PRESENT;
          this.addToken(token, true);
          working = "";

          // The character immediately following a `ATTR_END` *must* be another `SEPARATORS`
          // Depending on the next value, seed our token input
          let next = walker.next();
          if (next && !SEPARATORS.has(next)) { this.throw(ERRORS.expectsSepInsteadRec(next)); }
          token = (next === ATTR_BEGIN) ? { type: "attribute" } : { type: "class" };
          break;

        // We should never encounter whitespace in this switch statement.
        // The only place whitespace is allowed is between quotes, which
        // is handled above.
        case WHITESPACE_REGEXP.test(char):
          this.throw(ERRORS.whitespace);

        // If none of the above special characters, add this character to our working string.
        // This working string should always be a valid CSS Ident.
        // TODO: We need to handle invalid character escapes here!
        default:
          working += char;

      }

    }

    // Attribute tokens are explicitly terminated. If we are still working on an
    // attribute here then it has not been properly closed.
    if (isAttribute(token)) { this.throw(ERRORS.unclosedAttribute); }

    // Class and Block tokens are not explicitly terminated and may be automatically sealed when
    // we get to the end. If no class has been discovered, automatically add our root class.
    if (!isAttribute(token) && working) {
      if (!isIdent(working)) { return this.throw(ERRORS.invalidIdent(working), working.length); }
      token.name = working;
      this.addToken(token, true);
    }
    if (!this._class) { this.addToken({ type: "class", name: ROOT_CLASS }, false); }
  }

  /**
   * Create a new BlockPath object via a path string, other BlockPath object, or array of tokens.
   * @param path The BlockPath input data.
   * @param location An optional ErrorLocation object for more detailed error reporting.
   */
  constructor(path: string | BlockPath, location?: ErrorLocation) {
    this._location = location;
    this.original = path.toString();
    if (path instanceof BlockPath) {
      this.parts = path.parts;
    }
    else {
      this.walker.init(path);
      this.tokenize();
    }
  }

  private static from(tokens: Token[]) {
    let path = new BlockPath("");
    path.parts = tokens;
    return path;
  }

  /**
   * Get the parsed Style path of this Block Path
   */
  get path(): string {
    return stringify(this.parts.slice(1));
  }

  /**
   * Get the parsed block name of this Block Path
   */
  get block(): string {
    return this._block ? this._block.name : "";
  }

  /**
   * Get the parsed class name of this Block Path
   */
  get class(): string {
    return this._class && this._class.name || ROOT_CLASS;
  }

  /**
   * Get the parsed attribute name of this Block Path and return the `AttrInfo`
   */
  get attribute(): AttrToken | undefined {
    if (!this._attribute) return;
    return this._attribute;
  }

  /**
   * Return a pretty-printed formatted Block Path string from the tokenized data.
   */
  toString(): string {
    return stringify(this.parts);
  }

  /**
   * Return a new BlockPath without the parent-most token.
   */
  childPath() {
    return BlockPath.from(this.parts.slice(this._block && this._block.name ? 1 : 2));
  }

  /**
   * Return a new BlockPath without the child-most token.
   */
  parentPath() {
    return BlockPath.from(this.parts.slice(0, -1));
  }

  tokens(): Iterable<string> {
    return this._tokens.slice().map((t) => t.name);
  }

}
