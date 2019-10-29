import { BlockFactory } from "@css-blocks/core/dist/src";
import * as fs from "fs";
import { Definition, Position, TextDocument } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { getItemAtCursor, AttributeType } from "./hbsUtils";
import { transformPathsFromUri } from "./pathTransformer";

export async function getHbsDefinition(document: TextDocument, position: Position, blockFactory: BlockFactory, pathTransformer: PathTransformer): Promise<Definition> {
  let transformedPaths = transformPathsFromUri(document.uri, pathTransformer);
  let { blockFsPath } = transformedPaths;

  if (!blockFsPath) {
    return [];
  }

  let block = await blockFactory.getBlockFromPath(blockFsPath);
  let blockUri;
  let blockDocumentText;
  let itemAtCursor = getItemAtCursor(document.getText(), position);

  try {
    if (itemAtCursor && itemAtCursor.attribute.referencedBlock) {
      let referencedBlock = block.getExportedBlock(itemAtCursor.attribute.referencedBlock);
      if (referencedBlock) {
        blockUri = URI.file(referencedBlock.identifier).toString();
        blockDocumentText = fs.readFileSync(referencedBlock.identifier, {
          encoding: "utf8",
        });
      }
    } else if (itemAtCursor) {
      blockUri = URI.file(block.identifier).toString();
      blockDocumentText = fs.readFileSync(block.identifier, {
        encoding: "utf8",
      });
    }
  } catch (e) {
    return [];
  }

  if (blockDocumentText) {
    let lines = blockDocumentText.split(/\r?\n/);
    let selectorPositionLine;
    let attribute = itemAtCursor && itemAtCursor.attribute;
    let className = (attribute && attribute.attributeType === AttributeType.class && attribute.name) || "";

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(className)) {
        selectorPositionLine = i;
        break;
      }
    }

    if (typeof selectorPositionLine === "number") {
      return !blockUri ? [] : {
        uri: blockUri,
        range: {
          start: {
            line: selectorPositionLine,
            character: 1,
          },
          end: {
            line: selectorPositionLine,
            character: 1,
          },
        },
      };
    }
  }

  return [];
}
