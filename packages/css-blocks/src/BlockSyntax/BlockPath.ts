import { BlockPathError, ErrorLocation } from '../errors';
import { CLASS_NAME_IDENT as CSS_IDENT } from "./blockSyntax";
import { StateInfo } from "../BlockParser";

interface BlockToken {
  type: 'block';
  name: string;
}

interface ClassToken {
  type: 'class';
  name: string;
}

export interface StateToken {
  type: 'state';
  namespace: string;
  name: string;
  value?: string;
}

type Token = BlockToken | ClassToken | StateToken;

const isBlock = (token?: Token): token is BlockToken => !!token && token.type === 'block';
const isClass = (token?: Token): token is ClassToken => !!token && token.type === 'class';
const isState = (token?: Token): token is StateToken  => !!token && token.type === 'state';
const hasName = (token?: Token): boolean => !!token && !!token.name;
const hasNamespace = (token?: Token): boolean => isState(token) && !!token.namespace;

const STATE_BEGIN = "[";
const STATE_END = "]";
const CLASS_BEGIN = ".";
const NAMESPACE_END = "|";
const VALUE_START = "=";
const SINGLE_QUOTE = `'`;
const DOUBLE_QUOTE = `"`;
const WHITESPACE_REGEXP = /\s/g;
const SEPARATORS = new Set([CLASS_BEGIN, STATE_BEGIN]);

export const ERRORS = {
  whitespace: "Whitespace is only allowed in quoted state values",
  namespace: "State selectors are required to have a namespace.",
  noname: "Block path segments must include a valid name",
  unclosedState: "Unclosed state selector",
  mismatchedQuote: "No closing quote found in Block path",
  illegalChar: (c: string) => `Unexpected character "${c}" found in Block path.`,
  expectsSepInsteadRec: (c: string) => `Expected separator tokens "[" or ".", instead found \`${c}\``,
  illegalCharNotInState: (c: string) => `Only state selectors may contain the \`${c}\` character.`,
  illegalCharInState: (c: string) => `State selectors may not contain the \`${c}\` character.`,
  multipleOfType: (t: string) => `Can not have more than one ${t} selector in the same Block path`,
};

function stringify(tokens: Token[]): string {
  let out = "";
  for (let token of tokens) {
         if (isBlock(token)) { out += token.name; }
    else if (isClass(token)) { out += `.${token.name}`; }
    else if (isState(token)) { out += `[${token.namespace}|${token.name}${token.value ? `="${token.value}"` : ''}]`; }
  }
  return out;
}

/**
 * Simple utility to easily walk over string data one character at a time.
 */
class Walker {
  private data: string;
  private length: number;
  private idx = 0;

  constructor(data: string){
    this.data = data;
    this.length = data.length;
  }

  next(): string { return this.data[this.idx++]; }
  peek(): string { return this.data[this.idx]; }

  /**
   * Consume all characters that do not match the provided Set or strings
   * and return the discovered value.
   * @param stop  A Set of strings, or arguments list of strings, that will halt character ingestion.
   */
  consume(stop: string | Set<string>, ...args: string[]): string {
    let out = "";
    stop = typeof stop === 'string' ? new Set([stop, ...args]) : stop;
    while (!stop.has(this.data[this.idx]) && this.idx <= this.length-1) {
      out += this.data[this.idx++];
    }
    return out;
  }

}

/**
 * Parser and container object for Block Path data.
 */
export class BlockPath {
  private _location: ErrorLocation | undefined;
  private _block: BlockToken;
  private _class: ClassToken;
  private _state: StateToken;

  private tokens: Token[] = [];

  /**
   * Throw a new BlockPathError with the given message.
   * @param msg The error message.
   */
  private throw(msg: string): never {
    throw new BlockPathError(msg, this._location);
  }

  /**
   * Used by `tokenize` to insert a newly constructed token.
   * @param token The token to insert.
   */
  private addToken(token: Token): void {

    // Final validation of incoming data.
    if (!isBlock(token) && !hasName(token)) { this.throw(ERRORS.noname); }
    if (isState(token) && !hasNamespace(token)) { this.throw(ERRORS.namespace); }

    // Ensure we only have a single token of each type per block path.
    if (isBlock(token)) {
      this._block = this._block ? this.throw(ERRORS.multipleOfType(token.type)) : token;
    }
    if (isClass(token)) {
      this._class = this._class ? this.throw(ERRORS.multipleOfType(token.type)) : token;
    }
    if (isState(token)) {
      this._state = this._state ? this.throw(ERRORS.multipleOfType(token.type)) : token;
    }

    // Add the token.
    this.tokens.push(token);
  }

  /**
   * Given a Block Path string, convert it into tokens. Throw
   * with a helpful error if we encounter invalid Block Path syntax.
   * @param str The Block Path string.
   */
  private tokenize(str: string): void {
    let char,
        working = "",
        walker = new Walker(str),
        token: Token = { type: 'block', name: '' };

    while (char = walker.next()) {

      switch (true) {

        // If a period, we've finished the previous token and are now building a class name.
        case char === CLASS_BEGIN:
          if (isState(token)) { this.throw(ERRORS.illegalCharInState(char)); }
          token.name = working;
          this.addToken(token);
          token = { type: 'class', name: '' };
          working = "";
          break;

        // If the beginning of a state, we've finished the previous token and are now building a state.
        case char === STATE_BEGIN:
          if (isState(token)) { this.throw(ERRORS.illegalCharInState(char)); }
          token.name = working;
          this.addToken(token);
          token = { type: 'state', namespace: '', name: '' };
          working = "";
          break;

        // If the end of a state, set the state part we've been working on and finish.
        case char === STATE_END:
          if (!isState(token)) { return this.throw(ERRORS.illegalCharNotInState(char)); }
          token.name ? (token.value = working) : (token.name = working);
          this.addToken(token);
          working = "";

          // The character immediately following a `STATE_END` *must* be another `SEPARATORS`
          // Depending on the next value, seed our token input
          let next = walker.next();
          if (next && !SEPARATORS.has(next)) { this.throw(ERRORS.expectsSepInsteadRec(next)); }
          token = (next === STATE_BEGIN) ? { type: 'state', namespace: '', name: '' } : { type: 'class', name: '' };
          break;

        // When we find a namespace terminator, set the namespace property of the state token we're working on.
        case char === NAMESPACE_END:
          if (!isState(token)) { return this.throw(ERRORS.illegalCharNotInState(char)); }
          token.namespace = working;
          working = "";
          break;

        // If the start of the value section of a state part, set the name we've been working on and move on.
        case char === VALUE_START:
          if (!isState(token)) { this.throw(ERRORS.illegalCharNotInState(char)); }
          if (!working) { this.throw(ERRORS.noname); }
          token.name = working;
          working = "";
          break;

        // If the opening quote of the value section of a state part, greedily consume everything between quotes.
        case char === SINGLE_QUOTE || char === DOUBLE_QUOTE:
          if (!isState(token)) { return this.throw(ERRORS.illegalCharNotInState(char)); }
          working = walker.consume(char);
          if (walker.peek() !== char) { this.throw(ERRORS.mismatchedQuote); }
          walker.next(); // Throw away the other quote
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
          if (!CSS_IDENT.test(working)) { return this.throw(ERRORS.illegalChar(char)); }

      }

    }

    // State tokens are explicitly terminated. If we are still working on a state here
    // then it has not been properly closed.
    if (isState(token)) { this.throw(ERRORS.unclosedState); }

    // Class and Block tokens are not explicitly terminated and may be sealed when we
    // get to the end.
    if (!isState(token) && working) {
      token.name = working;
      this.addToken(token);
    }
  }

  /**
   * Create a new BlockPath object via a path string, other BlockPath object, or array of tokens.
   * @param path The BlockPath input data.
   * @param location An optional ErrorLocation object for more detailed error reporting.
   */
  constructor(path: string | BlockPath, location?: ErrorLocation) {
    this._location = location;
    if (path instanceof BlockPath) {
      this.tokens = path.tokens;
    }
    else {
      this.tokenize(path);
    }
  }

  private static from(tokens: Token[]) {
    let path = new BlockPath('');
    path.tokens = tokens;
    return path;
  }

  /**
   * Get the parsed Style path of this Block Path
   */
  get path(): string {
    return stringify(this.tokens.slice(1));
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
    return this._class && this._class.name || "root";
  }

  /**
   * Get the parsed state name of this Block Path and return the `StateInfo`
   */
  get state(): StateInfo | undefined {
    return {
      group: this._state.value ? this._state.name : undefined,
      name: this._state.value || this._state.name,
    };
  }

  /**
   * Return a pretty-printed formatted Block Path string from the tokenized data.
   */
  toString(): string {
    return stringify(this.tokens);
  }

  /**
   * Return a new BlockPath without the parent-most token.
   */
  childPath() {
    return BlockPath.from(this.tokens.slice(1));
  }

  /**
   * Return a new BlockPath without the child-most token.
   */
  parentPath() {
    return BlockPath.from(this.tokens.slice(0, -1));
  }

}