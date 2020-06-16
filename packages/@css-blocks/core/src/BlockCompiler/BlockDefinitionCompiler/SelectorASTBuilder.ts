
import { AttributeSelector, ClassSelector, DefinitionAST, ForeignAttributeSelector, ScopeSelector, Visitor } from "../../BlockParser/ast";

export class SelectorASTBuilder implements Visitor<DefinitionAST> {
  selector: string;
  constructor() {
    this.selector = "";
  }
  AttributeSelector(attr: AttributeSelector): void {
    this.selector += `[${attr.attribute}`;
    if (attr.matches) {
      this.selector += attr.matches.matcher;
      this.selector += `"${attr.matches.value}"`;
    }
    this.selector += "]";
  }
  ForeignAttributeSelector(attr: ForeignAttributeSelector): void {
    this.selector += `[${attr.ns}|${attr.attribute}`;
    if (attr.matches) {
      this.selector += attr.matches.matcher;
      this.selector += `"${attr.matches.value}"`;
    }
    this.selector += "]";
  }
  ScopeSelector(_scopeSelector: ScopeSelector): void {
    this.selector += `:scope`;
  }
  ClassSelector(classSelector: ClassSelector): void {
    this.selector += `.${classSelector.name}`;
  }
}
