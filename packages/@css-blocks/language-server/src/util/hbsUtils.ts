import {
  Block,
  BlockFactory,
  CssBlockError,
  DEFAULT_NAMESPACE,
  SourceRange,
  isNamespaceReserved,
} from "@css-blocks/core";
import { AST, Walker, preprocess } from "@glimmer/syntax";
import { ElementNode } from "@glimmer/syntax/dist/types/lib/types/nodes";
import { Position, TextDocuments } from "vscode-languageserver";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { FocusPath, createFocusPath } from "./createFocusPath";
import { toPosition } from "./estTreeUtils";
import { transformPathsFromUri } from "./pathTransformer";

/**
 * Recursively walk a glimmer ast and execute a callback for each class
 * attribute.
 */
function walkClasses(astNode: AST.Node, callback: (namespace: string, classAttr: AST.AttrNode, classAttrValue: AST.TextNode) => void) {
  let walker = new Walker();
  walker.visit(astNode, (node) => {
    if (node.type === "ElementNode") {
      for (let attrNode of node.attributes) {
        let nsAttr = parseNamespacedBlockAttribute(attrNode);
        if (nsAttr && isClassAttribute(nsAttr) && attrNode.value.type === "TextNode") {
          callback(nsAttr.ns, attrNode, attrNode.value);
        }
      }
    }
  });
}

/**
 * A simple helper to determine whether an attribute node's text value is
 * defined with wrapping quotes or with "raw text." In the case of raw,
 * unquoted text the length of the `chars` string will be exactly equal to the
 * length of the location start and end values. In the case of a quoted string,
 * the length of the location start and end will be greater than the length of
 * the raw value.
 */
function hasQuotedAttributeValue(attr: AST.TextNode) {
  if (attr.loc.end.line - attr.loc.start.line > 0) {
    return true;
  }

  return (attr.loc.end.column - attr.loc.start.column - attr.chars.length) > 0;
}

/**
 * Walks the class attribute nodes of a glimmer template ast and uses its
 * corresponding css block to check for errors.
 */
export function hbsErrorParser(
  documentText: string,
  block: Block,
): CssBlockError[] {
  let ast = preprocess(documentText);
  let errors: CssBlockError[] = [];

  walkClasses(ast, (blockName, classAttr, classAttrValue) => {
    let rawTextChars = classAttrValue.chars;
    let lines = rawTextChars.split(/\r?\n/);
    let blockOfClass = blockName === "block" ? block : block.getExportedBlock(blockName);

    if (!blockOfClass) {
      let range: SourceRange = {
        start: {
          line: classAttr.loc.start.line,
          column: classAttr.loc.start.column + 1,
        },
        end: {
          line: classAttr.loc.start.line,
          column: classAttr.loc.start.column + blockName.length,
        },
      };
      errors.push(new CssBlockError(`No exported block named '${blockName}'.`, range));
      return;
    }

    lines.forEach((line, lineNum) => {
      if (!line.trim().length) {
        return;
      }

      line.split(/\s+/).forEach(className => {
        if (className.length === 0) {
          return;
        }

        let klass = blockOfClass!.getClass(className);
        if (klass === null) {
          let startColumnOffset = hasQuotedAttributeValue(classAttrValue) ? 1 : 0;
          let classNameStartColumn = lineNum === 0 ? classAttrValue.loc.start.column + line.indexOf(className) + startColumnOffset : line.indexOf(className);
          let classNameLine = classAttrValue.loc.start.line + lineNum;

          let range: SourceRange = {
            start: {
              line: classNameLine,
              column: classNameStartColumn + 1,
            },
            end: {
              line: classNameLine,
              column: classNameStartColumn + className.length,
            },
          };

          errors.push(new CssBlockError(`Class name '${className}' not found.`, range));
        }
      });
    });
  });

  return errors;
}

export function isTemplateFile(uri: string) {
  return uri.endsWith(".hbs");
}

interface ErrorsForUri {
  uri: string;
  errors: CssBlockError[];
}

export async function validateTemplates(
  documents: TextDocuments,
  factory: BlockFactory,
  pathTransformer: PathTransformer,
): Promise<Map<string, CssBlockError[]>> {
  let openTextDocuments = documents
    .all()
    .filter(doc => isTemplateFile(doc.uri));

  let errorsForUri: (ErrorsForUri | null)[] = await Promise.all(
    openTextDocuments.map(
      async (document): Promise<ErrorsForUri | null> => {
        const { blockFsPath, templateUri } = transformPathsFromUri(
          document.uri,
          pathTransformer,
          factory.configuration,
        );
        if (blockFsPath && templateUri) {
          try {
            let block = await factory.getBlockFromPath(blockFsPath);
            let documentText = document.getText();
            let errors = hbsErrorParser(documentText, block);

            return {
              uri: templateUri,
              errors,
            };
          } catch (e) {
            // TODO: we need to do *something* about this
          }
        }
        return null;
      },
    ),
  );

  return errorsForUri.reduce((result, uriWithErrors) => {
    if (uriWithErrors) {
      result.set(uriWithErrors.uri, uriWithErrors.errors);
    }
    return result;
  },                         new Map());
}

export const enum AttributeType {
  state = "state",
  class = "class",
  scope = "scope",
  ambiguous = "ambiguous",
}

interface BlockAttributeBase {
  attributeType: AttributeType;
  referencedBlock?: string;
}

export interface ScopeAttribute extends BlockAttributeBase {
  attributeType: AttributeType.scope;
}

export interface ClassAttribute extends BlockAttributeBase {
  attributeType: AttributeType.class;
  name?: string;
}

export interface StateAttribute extends BlockAttributeBase {
  attributeType: AttributeType.state;
  name: string;
  value?: string;
}

export interface AmbiguousAttribute extends BlockAttributeBase {
  attributeType: AttributeType.ambiguous;
  referencedBlock?: undefined;
  name: string;
}

export type BlockAttribute = ScopeAttribute | ClassAttribute | StateAttribute | AmbiguousAttribute;

interface NamespacedAttr {
  ns: string;
  name: string;
  value?: string;
}

export interface ItemAtCursor {
  attribute: BlockAttribute;
  siblingAttributes: ClassAttribute[];
}

function getParentElement(focusRoot: FocusPath | null): ElementNode | null {
  let curr = focusRoot;

  while (curr) {
    if (curr.data && curr.data.type === "ElementNode") {
      return curr.data;
    }
    curr = curr.parent;
  }

  return null;
}

function buildClassAttribute(attr: NamespacedAttr | null, attrValue: AST.AttrNode["value"]): ClassAttribute | null {
  if (attr === null) return null;
  if (attrValue.type === "TextNode") {
    if (attr.ns === "block") {
      return {
        attributeType: AttributeType.class,
        name: attrValue.chars.trim(),
      };
    } else {
      return {
        attributeType: AttributeType.class,
        referencedBlock: attr.ns,
        name: attrValue.chars.trim(),
      };
    }
  } else {
    return null;
  }
}

function parseNamespacedBlockAttribute(attrNode: AST.Node | null | undefined): NamespacedAttr | null {
  if (!attrNode || !isAttrNode(attrNode)) return null;
  if (/([^:]+):([^:]+|$)/.test(attrNode.name)) {
    let ns = RegExp.$1;
    let name = RegExp.$2;
    if (isNamespaceReserved(ns)) {
      return null;
    }
    return {ns, name};
  }
  return null;
}

function isAttrNode(node: FocusPath | AST.Node | NamespacedAttr | null): node is AST.AttrNode {
  return node !== null && ((<AST.Node>node).type) === "AttrNode";
}

function isStateAttribute(attr: NamespacedAttr): boolean {
  return attr.name !== AttributeType.class && attr.name !== AttributeType.scope;
}

function isClassAttribute(attr: NamespacedAttr): boolean {
  return attr.name === AttributeType.class;
}

// TODO: this will be handy when we add support for the scope attribute.
//
// function isScopeAttribute(attr: NamespacedAttr | null): attr is NamespacedAttr {
//   if (attr === null) return false;
//   return attr.name === SupportedAttributes.scope;
// }

/**
 * Returns an object that represents the item under the cursor in the client
 * editor which contains metadata regarding sibling css-block classes,
 * referenced blocks, and the parent attribute type of the current item. The
 * sibling blocks are useful for making auto-completions for state attributes
 * more contextual.
 */
export function getItemAtCursor(text: string, position: Position): ItemAtCursor | null {
  let ast = preprocess(text);
  let focusRoot = createFocusPath(ast, toPosition(position));
  let data = focusRoot && focusRoot.data;

  let focusedAttr = focusRoot;
  while (focusedAttr && focusedAttr.data && focusedAttr.data.type !== "AttrNode") {
    focusedAttr = focusedAttr.parent;
  }

  let attrNode = focusedAttr && <AST.AttrNode | null>focusedAttr.data;

  if (!attrNode || !focusedAttr) {
    return null;
  }

  let attr = parseNamespacedBlockAttribute(attrNode);

  if (!attr) {
    return {
      attribute: {
        attributeType: AttributeType.ambiguous,
        name: attrNode.name,
      },
      siblingAttributes: [],
    };
  }

  if (isStateAttribute(attr)) {
    return getStateAtCursor(focusRoot, attr);
  }

  // TODO: Handle the other types of attribute value nodes
  if (isClassAttribute(attr) && data && data.type === "TextNode") {
    let attribute = buildClassAttribute(attr, data);
    if (attribute) {
      return { attribute, siblingAttributes: []};
    } else {
      return null;
    }
  }

  return null;
}

function getStateAtCursor(focusRoot: FocusPath | null, attr: NamespacedAttr): ItemAtCursor | null {
    let parentElement = getParentElement(focusRoot);

    if (!parentElement) {
      return null;
    }
    let attribute: StateAttribute = {
      attributeType: AttributeType.state,
      referencedBlock: attr.ns === DEFAULT_NAMESPACE ? undefined : attr.ns,
      name: attr.name,
    };
    let classAttributes = parentElement.attributes.map(attrNode => {
      return [parseNamespacedBlockAttribute(attrNode), attrNode.value] as const;
    }).filter(([attr, _attrValue]) => {
      return attr && isClassAttribute(attr);
    });

    let siblingAttributes = classAttributes.map(([attr, attrValue]) => {
      return buildClassAttribute(attr, attrValue);
    }).filter((bs): bs is ClassAttribute => {
      return bs !== null;
    });

    if (siblingAttributes.length > 0) {
      return {
        attribute,
        siblingAttributes,
      };
    } else {
      return null;
    }
}
