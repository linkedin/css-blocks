import { Block, BlockObject } from "./Block";
import postcss = require("postcss");
import { parseSelector, ParsedSelector } from "opticss";

export interface Query {
  execute(container: postcss.Container): ClassifiedParsedSelectors;
}

export interface ParsedSelectorAndRule {
  parsedSelector: ParsedSelector;
  rule: postcss.Rule;
}

export interface ClassifiedParsedSelectors {
  main: ParsedSelectorAndRule[];
  other: {
    [classification: string]: ParsedSelectorAndRule[];
  };
}

export class QueryKeySelector implements Query {
  target: BlockObject;
  constructor(obj: BlockObject) {
    this.target = obj;
  }

  execute(container: postcss.Container, block?: Block): ClassifiedParsedSelectors {
    let matchedSelectors: ClassifiedParsedSelectors = {
      main: [],
      other: {}
    };
    container.walkRules((node) => {
      let parsedSelectors = block && block.getParsedSelectors(node) || parseSelector(node);
      let found = parsedSelectors.filter((value: ParsedSelector) => this.target.matches(value.key));
      found.forEach((sel) => {
        let key = sel.key;
        if (key.pseudoelement !== undefined) {
          if (matchedSelectors.other[key.pseudoelement.value] === undefined) {
            matchedSelectors.other[key.pseudoelement.value] = [];
          }
          matchedSelectors.other[key.pseudoelement.value].push({parsedSelector: sel, rule: node});
        } else {
          matchedSelectors.main.push({parsedSelector: sel, rule: node});
        }
      });
    });
    return matchedSelectors;
  }
}
