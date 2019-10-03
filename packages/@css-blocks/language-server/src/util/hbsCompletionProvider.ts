import { Block, BlockFactory } from "@css-blocks/core/dist/src";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver-types";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { getItemAtCursor } from "./hbsUtils";
import { transformPathsFromUri } from "./pathTransformer";

export async function getHbsCompletions(document: TextDocument, position: Position, blockFactory: BlockFactory, pathTransformer: PathTransformer): Promise<CompletionItem[]> {
  let transformedPaths = transformPathsFromUri(document.uri, pathTransformer);
  let { blockFsPath } = transformedPaths;

  if (!blockFsPath) {
    return [];
  }

  try {
    let block: Block | null = await blockFactory.getBlockFromPath(blockFsPath);
    let itemAtCursor = getItemAtCursor(document.getText(), position);

    if (!(itemAtCursor && block)) {
      return [];
    }

    if (itemAtCursor.referencedBlock) {
      block = block.getExportedBlock(itemAtCursor.referencedBlock);
    }

    if (!block) {
      return [];
    }

    if (itemAtCursor.parentType === "class") {
      return block.classes
        // TODO: we should look at scope attributes if the user is on the
        // root element.
        .filter(blockClass => !blockClass.isRoot)
        .map(blockClass => {
          return {
            label: blockClass.name,
            kind: CompletionItemKind.Property,
          };
        });
    }

    if (itemAtCursor.parentType === "state") {
      let completions: CompletionItem[] = [];

      if (itemAtCursor.siblingBlocks && itemAtCursor.siblingBlocks.length) {
        itemAtCursor.siblingBlocks.forEach(blockSegments => {
          if (block && blockSegments.referencedBlock) {
            let referencedBlock = block.getExportedBlock(blockSegments.referencedBlock);

            if (referencedBlock && blockSegments.className) {
              const blockClass = referencedBlock.getClass(blockSegments.className);
              if (blockClass) {
                // TODO: this is currently getting all attributes, it should filter
                // to state only.
                const attributes = blockClass.getAttributes();
                completions = completions.concat(attributes.map(
                  (attr): CompletionItem => {
                    return {
                      label: `${attr.namespace}:${attr.name}`,
                      kind: CompletionItemKind.Property,
                    };
                  },
                ));
              }
            }
          } else if (block && blockSegments.className) {
            const blockClass = block.getClass(blockSegments.className);

            if (blockClass) {
              // TODO: this is currently getting all attributes, it should filter
              // to state only.
              const attributes = blockClass.getAttributes();
              completions = completions.concat(attributes.map(
                (attr): CompletionItem => {
                  return {
                    label: `${attr.namespace}:${attr.name}`,
                    kind: CompletionItemKind.Property,
                  };
                },
              ));
            }
          }
        });
      }

      return completions;
    }
    return [];
  } catch (e) {
    // TODO: We need to surface the error to the client.
    return [];
  }
}
