import * as selectorParser from "postcss-selector-parser";
const selectorParserFn = require("postcss-selector-parser");

import { selectorSourceLocation } from "./SourceLocation";
import * as errors from "./errors";

export interface SelectorNode {
  parent?: SelectorNode;
  type: string;
  value: string;
  spaces: {
    before: string,
    after: string
  };
  remove: () => SelectorNode;
  replaceWith: () => SelectorNode;
  next: () => SelectorNode;
  prev: () => SelectorNode;
  clone: (overrides: {[prop: string]: any}) => SelectorNode;
  toString: () => string;
}

export interface ParsedSelector {
  context?: SelectorNode[];
  combinator?: SelectorNode;
  key: SelectorNode[];
  pseudoelement?: SelectorNode;
}

function isPseudoelement(node: any) {
  return node.type === selectorParser.PSEUDO &&
    (
      node.value.startsWith("::") ||
      node.value === ":before" ||
      node.value === ":after"
    );
}

export interface StateInfo {
  group?: string;
  name: string;
}

export function stateParser(sourceFile: string, rule, pseudo): StateInfo {
  if (pseudo.nodes.length === 0) {
    // Empty state name or missing parens
    throw new errors.InvalidBlockSyntax(`:state name is missing`,
                                        selectorSourceLocation(sourceFile, rule, pseudo));
  }
  if (pseudo.nodes.length !== 1) {
    // I think this is if they have a comma in their :state like :state(foo, bar)
    throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                        selectorSourceLocation(sourceFile, rule, pseudo));
  }

  switch(pseudo.nodes[0].nodes.length) {
    case 3:
      return {
        group: pseudo.nodes[0].nodes[0].value.trim(),
        name: pseudo.nodes[0].nodes[2].value.trim()
      };
    case 1:
      return {
        name: pseudo.nodes[0].nodes[0].value.trim()
      };
    default:
      // too many state names
      throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                          selectorSourceLocation(sourceFile, rule, pseudo));
  }
}

export default function parseSelector(selector: string): ParsedSelector[] {
  let parsedSelectors: ParsedSelector[] = [];
  let selectors =  selectorParserFn().process(selector).res;
  selectors.nodes.forEach((sel) => {
    let parsedSel: ParsedSelector = <ParsedSelector>{};
    let compoundSel: any[] = [];
    let nodes = sel.nodes.slice().reverse();
    nodes.forEach((node) => {
      if (isPseudoelement(node)) {
        parsedSel.pseudoelement = node;
      } else if (node.type === selectorParser.COMBINATOR && parsedSel.combinator === undefined) {
        parsedSel.combinator = node;
        parsedSel.key = compoundSel;
        compoundSel = [];
      } else {
        compoundSel.unshift(node);
      }
    });
    if (parsedSel.key) {
      parsedSel.context = compoundSel;
    } else {
      parsedSel.key = compoundSel;
    }
    parsedSelectors.push(parsedSel);
  });
  return parsedSelectors;
}