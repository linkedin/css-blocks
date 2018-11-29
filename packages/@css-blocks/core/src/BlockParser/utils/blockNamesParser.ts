import { DEFAULT_EXPORT } from "../../BlockSyntax";

/**
 * Map of `aliasName` to `blockName`. Used to store data from `@block`
 * import / export statements.
 */
export interface BlockNames { [aliasName: string]: string; }

/**
 * Defines parser state for a single run of the parser function.
 * TODO: Illustrate FSM.
 */
interface ParserState {
  useDefault: boolean;
  buildingAlias: boolean;
  inParens: boolean;
  block: string;
  token: string;
  alias: string;
}

/**
 * If a token exists, save it as the discovered `block` and `alias`, or just the `alias`,
 * depending on what what state the FSM is in – aka, building an alias or not.
 * @param state The parser state object to modify.
 * @return The token applied.
 */
function commit(state: ParserState): string {
  if (!state.token) { return state.token; }
  if (state.buildingAlias) { return state.alias = state.token; }
  return state.alias = state.block = state.token;
}

/**
 * Depending on FSM state – in `useDefault` mode, or in a parens statement –
 * reset `token`, `alias`, and `block` values as required.
 * @param state The parser state object to reset.
 */
function reset(state: ParserState) {
  if (!state.useDefault || state.inParens) {
    state.buildingAlias = false;
    state.token = state.alias = state.block = "";
  }
  else {
    state.buildingAlias = true;
    state.token = state.alias = "";
    state.block = DEFAULT_EXPORT;
  }
}

/**
 * Simple single lookahead parser to return Block name mappings from an import or export string.
 * @param str The import string to parse.
 * @param useDefault If idents specified outside of parens should reference the default block, or a local block of the same name.
 * @return BlockNames Block name alias map in the form of { [aliasName]: sourceName }
 */
export function parseBlockNames(str: string, useDefault: boolean): BlockNames {
  const mapping: BlockNames = {};
  const state: ParserState = {
    useDefault,
    buildingAlias: useDefault,
    inParens: !useDefault,
    block: useDefault ? DEFAULT_EXPORT : "",
    token: "",
    alias: "",
  };

  for (let next of str) {
    switch (state.token) {
      case "as":
        state.buildingAlias = true;
        state.token = "";
        break;
      default: break;
    }
    switch (next) {
      case ",":
        commit(state);
        mapping[state.alias] = state.block;
        reset(state);
        break;
      case "(":
        state.buildingAlias = false;
        state.inParens = true;
        break;
      case ")":
        state.inParens = false;
        break;
      case " ":
        commit(state);
        state.token = "";
        break;
      default:
        state.token = `${state.token}${next}`;
        break;
    }

  }
  commit(state);
  mapping[state.alias] = state.block;
  return mapping;
}
