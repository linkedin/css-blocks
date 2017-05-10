import * as selectorParser from "postcss-selector-parser";
const selectorParserFn = require("postcss-selector-parser");

export type SelectorNode = {type: string, value: string};

export interface ParsedSelector {
  context?: SelectorNode[];
  combinator?: SelectorNode;
  key: SelectorNode[];
  pseudoelement?: SelectorNode;
}

export default function parseSelector(selector: string): ParsedSelector[] {
  let parsedSelectors: ParsedSelector[] = [];
  let selectors =  selectorParserFn().process(selector).res;
  selectors.nodes.forEach((sel) => {
    let parsedSel: ParsedSelector = <ParsedSelector>{};
    let compoundSel: any[] = [];
    let nodes = sel.nodes.slice().reverse();
    nodes.forEach((node) => {
      if (node.type === selectorParser.PSEUDO && node.value.startsWith("::")) {
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