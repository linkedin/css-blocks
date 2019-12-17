import { CssBlockError } from "@css-blocks/core";
import { AST } from "@glimmer/syntax";
import { TemplateInfo } from "@opticss/template-api";
import { ClassifiedParsedSelectors } from "opticss";

import { TEMPLATE_TYPE } from "./Template";

export function pathFromSpecifier(specifier: string) {
  return specifier.split(":")[1];
}

export function selectorCount(result: ClassifiedParsedSelectors) {
  let count = result.main.length;
  Object.keys(result.other).forEach((k) => {
    count += result.other[k].length;
  });
  return count;
}

export function parseSpecifier(specifier: string): { componentType: string; componentName: string } | null {
  if (/^(component|template|stylesheet):(.*)$/.test(specifier)) {
    return {
      componentType: RegExp.$1,
      componentName: RegExp.$2,
    };
  } else {
    return null;
  }
}

export function cssBlockError(message: string, node: AST.Node, template: TemplateInfo<TEMPLATE_TYPE>) {
  return new CssBlockError(message, {
    filename: node.loc.source || template.identifier,
    start: node.loc.start,
    end: node.loc.end,
  });
}

export function isStringLiteral(value: AST.Node | undefined): value is AST.StringLiteral {
  return value !== undefined && value.type === "StringLiteral";
}
export function isConcatStatement(value: AST.Node | undefined): value is AST.ConcatStatement {
  return !!value && value.type === "ConcatStatement";
}
export function isTextNode(value: AST.Node | undefined): value is AST.TextNode {
  return !!value && value.type === "TextNode";
}
export function isBooleanLiteral(value: AST.Node | undefined): value is AST.BooleanLiteral {
  return !!value && value.type === "BooleanLiteral";
}
export function isMustacheStatement(value: AST.Node | undefined): value is AST.MustacheStatement {
  return !!value && value.type === "MustacheStatement";
}
export function isSubExpression(value: AST.Node | undefined): value is AST.SubExpression {
  return !!value && value.type === "SubExpression";
}
export function isElementNode(value: AST.Node | undefined): value is AST.ElementNode {
  return !!value && value.type === "ElementNode";
}
