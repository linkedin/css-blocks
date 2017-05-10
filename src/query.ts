import { BlockObject } from "./Block";
import postcss = require("postcss");
import parseSelector, { ParsedSelector } from "./parseSelector";

export interface Query {
  execute(container: postcss.Container): ClassifiedParsedSelectors;
}

export interface ParsedSelectorAndRule {
  parsedSelector: ParsedSelector;
  rule: postcss.Rule;
}

export interface ClassifiedParsedSelectors {
  [classification: string]: ParsedSelectorAndRule[];
}

export interface KeySelectorWithPsuedoelements extends ClassifiedParsedSelectors {
  key: ParsedSelectorAndRule[];
}

export class QueryKeySelector implements Query {
  target: BlockObject;
  constructor(obj: BlockObject) {
    this.target = obj;
  }

  execute(container: postcss.Container): KeySelectorWithPsuedoelements {
    let matchedSelectors: KeySelectorWithPsuedoelements = {
      key: []
    };
    container.walkRules((node) => {
      let parsedSelectors = parseSelector(node.selector);
      let found = parsedSelectors.filter((value: ParsedSelector) =>
        this.target.matches(value.key));
      found.forEach((sel) => {
        if (sel.pseudoelement !== undefined) {
          if (matchedSelectors[sel.pseudoelement.value] === undefined) {
            matchedSelectors[sel.pseudoelement.value] = [];
          }
          matchedSelectors[sel.pseudoelement.value].push({parsedSelector: sel, rule: node});
        } else {
          matchedSelectors.key.push({parsedSelector: sel, rule: node});
        }
      });
    });
    return matchedSelectors;
  }
}