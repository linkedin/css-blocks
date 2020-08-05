import { CssBlockError } from "@css-blocks/core";
import type { AST } from "@glimmer/syntax";
import { ClassifiedParsedSelectors } from "opticss";

export type AnalyzableNode = AST.ElementNode | AST.BlockStatement | AST.MustacheStatement | AST.SubExpression;
export type AnalyzableProperty = AST.AttrNode | AST.HashPair | AST.PathExpression;

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

export function pathString(node: AST.MustacheStatement | AST.BlockStatement | AST.SubExpression): string | null {
  if (isStringLiteral(node.path) || isPathExpression(node.path)) {
    return node.path.original;
  } else {
    return null;
  }
}

export function cssBlockError(message: string, node: AST.Node, templatePath: string) {
  return new CssBlockError(message, {
    filename: node.loc.source || templatePath,
    start: node.loc.start,
    end: node.loc.end,
  });
}

export function isStringLiteral(value: AST.Node | undefined | null): value is AST.StringLiteral {
  return value !== undefined && value !== null && value.type === "StringLiteral";
}
export function isConcatStatement(value: AST.Node | undefined | null): value is AST.ConcatStatement {
  return !!value && value.type === "ConcatStatement";
}
export function isTextNode(value: AST.Node | undefined | null): value is AST.TextNode {
  return !!value && value.type === "TextNode";
}
export function isBooleanLiteral(value: AST.Node | undefined | null): value is AST.BooleanLiteral {
  return !!value && value.type === "BooleanLiteral";
}
export function isMustacheStatement(value: AST.Node | undefined | null): value is AST.MustacheStatement {
  return !!value && value.type === "MustacheStatement";
}
export function isBlockStatement(value: AST.Node | undefined | null): value is AST.BlockStatement {
  return !!value && value.type === "BlockStatement";
}
export function isSubExpression(value: AST.Node | undefined | null): value is AST.SubExpression {
  return !!value && value.type === "SubExpression";
}
export function isElementNode(value: AST.Node | undefined | null): value is AST.ElementNode {
  return !!value && value.type === "ElementNode";
}
export function isNumberLiteral(value: AST.Node | undefined | null): value is AST.NumberLiteral {
  return !!value && value.type === "NumberLiteral";
}
export function isNullLiteral(value: AST.Node | undefined | null): value is AST.NullLiteral {
  return !!value && value.type === "NullLiteral";
}
export function isUndefinedLiteral(value: AST.Node | undefined | null): value is AST.UndefinedLiteral {
  return !!value && value.type === "UndefinedLiteral";
}
export function isPathExpression(value: AST.Node | undefined | null): value is AST.PathExpression {
  return !!value && value.type === "PathExpression";
}
export function isHashPair(value: AST.Node | undefined | null): value is AST.HashPair {
  return !!value && value.type === "HashPair";
}
export function isAttrNode(value: AST.Node | undefined | null): value is AST.AttrNode {
  return !!value && value.type === "AttrNode";
}
export function isAnalyzableProperty(value: AST.Node | undefined | null): value is AnalyzableProperty {
  return !!value && (isAttrNode(value) || isHashPair(value) || isPathExpression(value));
}
