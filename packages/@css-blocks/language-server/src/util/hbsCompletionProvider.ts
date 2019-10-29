import { Block, BlockFactory } from "@css-blocks/core";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver-types";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { getItemAtCursor, AttributeType, ClassAttribute } from "./hbsUtils";
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

    let attributeAtCursor = itemAtCursor.attribute;
    if (attributeAtCursor.referencedBlock) {
      block = block.getExportedBlock(attributeAtCursor.referencedBlock);
    }

    if (!block) {
      return [];
    }

    if (attributeAtCursor.attributeType === AttributeType.ambiguous) {
      let completions: CompletionItem[] = [
        {
          label: "block:",
          kind: CompletionItemKind.Property,
        }
      ];
      block.eachBlockExport((name) => {
        completions.push({
          label: `${name}:`,
          kind: CompletionItemKind.Property,
        });
      });
      return completions;
    }

    if (attributeAtCursor.attributeType === AttributeType.class) {
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

    if (attributeAtCursor.attributeType === AttributeType.state) {
      let completions: CompletionItem[] = [];

      // The state might be a partially typed "class" or "scope"
      if ("class".startsWith(attributeAtCursor.name)) {
        let siblingClass: ClassAttribute | undefined = itemAtCursor.siblingAttributes.find((attr) => attr.referencedBlock === attributeAtCursor.referencedBlock);
        if (!siblingClass) { // don't suggest if the class for a block that is already added.
          completions.push({
            label: "class",
            kind: CompletionItemKind.Property,
          });
        }
      }
      if ("scope".startsWith(attributeAtCursor.name)) {
        if (attributeAtCursor.referencedBlock) { // don't suggest scope for the default block.
          completions.push({
            label: "scope",
            kind: CompletionItemKind.Property,
          });
        }
      }
      if (itemAtCursor.siblingAttributes && itemAtCursor.siblingAttributes.length) {
        itemAtCursor.siblingAttributes.forEach(classAttribute => {
          if (block && classAttribute.referencedBlock === attributeAtCursor.referencedBlock) {
            if (classAttribute.name) {
              const blockClass = block.getClass(classAttribute.name);
              if (blockClass) {
                const attributes = blockClass.getAttributes();
                completions = completions.concat(attributes.map(
                  (attr): CompletionItem => {
                    return {
                      label: attr.name,
                      kind: CompletionItemKind.Property,
                    };
                  },
                ));
              }
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
