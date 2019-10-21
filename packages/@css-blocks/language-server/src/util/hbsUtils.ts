import {
  Block,
  BlockFactory,
  CssBlockError,
  SourceRange,
} from "@css-blocks/core/dist/src";
import { AST, preprocess } from "@glimmer/syntax";
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
function walkClasses(astNode: AST.Node | AST.Node[], callback: (classAttr: AST.TextNode) => void) {
  if (Array.isArray(astNode)) {
    astNode.forEach((node: AST.Node) => {
      if (node.type === "ElementNode") {
        node.attributes.forEach((attr: AST.AttrNode) => {
          if (attr.name === "class" && attr.value.type === "TextNode") {
            callback(attr.value);
          }
        });
        if (node.children.length) {
          walkClasses(node.children, callback);
        }
      }
    });
  } else {
    if (astNode.type === "ElementNode") {
      astNode.attributes.forEach((attr: AST.AttrNode) => {
        if (attr.name === "class" && attr.value.type === "TextNode") {
          callback(attr.value);
        }
      });

      if (astNode.children.length) {
        walkClasses(astNode.children, callback);
      }
    }
  }
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

  walkClasses(ast.body, (classAttr) => {
    let rawTextChars = classAttr.chars;
    let lines = rawTextChars.split(/\r?\n/);

    lines.forEach((line, i) => {
      if (!line.trim().length) {
        return;
      }

      line.split(/\s+/).forEach(className => {
        if (!className.trim().length) {
          return;
        }

        let startColumnOffset = hasQuotedAttributeValue(classAttr) ? 1 : 0;
        let classNameStartColumn = i === 0 ? classAttr.loc.start.column + line.indexOf(className) + startColumnOffset : line.indexOf(className);
        let classNameLine = classAttr.loc.start.line + i;

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

        try {
          const blockName = className.includes(".")
            ? className
            : `.${className}`;
          block.lookup(blockName, range);
        } catch (e) {
          errors.push(e);
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

export enum SupportedAttributes {
  state = "state",
  class = "class",
}

interface BlockSegments {
  referencedBlock?: string;
  className?: string;
}

interface ItemAtCursor extends BlockSegments {
  parentType: SupportedAttributes;
  siblingBlocks?: BlockSegments[];
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

function buildBlockSegments(className: string): BlockSegments {
  let segments = className.split(".");

  if (segments.length > 1) {
    return {
      referencedBlock: segments[0],
      className: segments[1],
    };
  }

  return {
    className: segments[0],
  };
}

function isStateAttribute(parentNode: FocusPath): Boolean {
  return !!(parentNode.data && parentNode.data.type === "AttrNode" && parentNode.data.name === SupportedAttributes.state);
}

function isClassAttribute(parentNode: FocusPath): Boolean {
  return !!(parentNode.data && parentNode.data.type === "AttrNode" && parentNode.data.name === SupportedAttributes.class);
}

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

  if (!(focusRoot && focusRoot.data && focusRoot.data.type === "TextNode")) {
    return null;
  }

  let parentNode = focusRoot.parent;

  if (!parentNode) {
    return null;
  }

  if (isStateAttribute(parentNode)) {
    let parentElement = getParentElement(focusRoot);

    if (!parentElement) {
      return null;
    }

    let classAttrNode = parentElement.attributes.find(attrNode => attrNode.name === SupportedAttributes.class);
    let classAttrValue = classAttrNode && classAttrNode.value;

    if (classAttrValue && classAttrValue.type === "TextNode") {
      return {
        parentType: SupportedAttributes.state,
        siblingBlocks: classAttrValue.chars.split(/\s+/).map(buildBlockSegments),
      };
    }
  }

  if (isClassAttribute(parentNode)) {
    let focusedLineInNode = position.line - focusRoot.data.loc.start.line + 1;
    let { chars } = focusRoot.data;
    let lines = chars.split(/\r?\n/);
    let classNameString = lines[focusedLineInNode];
    let focusedColumnInNode = focusedLineInNode === 0 ?
      position.character - focusRoot.data.loc.start.column - 1 :
      position.character;

    let suffix = classNameString
      .slice(focusedColumnInNode)
      .split(/\s+/)
      .shift();
    let prefix = classNameString
      .slice(0, focusedColumnInNode)
      .split(/\s+/)
      .reverse()
      .shift();

    let selectedText = `${prefix}${suffix}`;
    let segments = selectedText.split(".");
    let hasBlockReference = segments.length > 1;

    if (hasBlockReference) {
      return {
        referencedBlock: segments[0],
        className: segments[1],
        parentType: SupportedAttributes.class,
      };
    }

    return {
      className: segments[0],
      parentType: SupportedAttributes.class,
    };
  }

  return null;
}
