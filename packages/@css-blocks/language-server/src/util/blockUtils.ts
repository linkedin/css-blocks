import { CssBlockError, Syntax } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import * as fs from "fs";
import * as glob from "glob";
import { postcss } from "opticss";
import * as path from "path";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { LINK_REGEX } from "../documentLinksProviders/blockLinkProvider";

// TODO: Currently we are only supporting css. This should eventually support all
// of the file types supported by css blocks
export function isBlockFile(uriOrFsPath: string) {
  return uriOrFsPath.endsWith(".block.css");
}

export async function parseBlockErrors(parser: BlockParser, blockFsPath: string, sourceText: string): Promise<CssBlockError[]> {
  let errors: CssBlockError[] = [];

  try {
    await parser.parseSource({
      identifier: blockFsPath,
      defaultName: path.parse(blockFsPath).name.replace(/\.block/, ""),
      originalSource: sourceText,
      originalSyntax: Syntax.css,
      parseResult: postcss.parse(sourceText, { from: blockFsPath }),
      dependencies: [],
    });
  } catch (error) {
    if (error instanceof CssBlockError) {
      errors = errors.concat(error);
    }
  }

  return errors;
}

/**
 * If the cursor line has an import path, we check to see if the current position
 * of the cursor in the line is within the bounds of the import path to decide
 * whether to provide import path completions.
 */
function shouldCompleteImportPath(importPathMatches: RegExpMatchArray, position: Position, lineText: string): boolean {
  let relativeImportPath = importPathMatches[2];
  let relativeImportPathStartLinePosition = lineText.indexOf(relativeImportPath);
  let relativeImportPathEndLinePosition = relativeImportPathStartLinePosition + relativeImportPath.length;
  return relativeImportPathStartLinePosition <= position.character && relativeImportPathEndLinePosition >= position.character;
}

async function getImportPathCompletions(documentUri: string, relativeImportPath: string): Promise<CompletionItem[]> {
  let completionItems: CompletionItem[] = [];

  // if the user has only typed leading dots, don't complete anything.
  if (/^\.+$/.test(relativeImportPath)) {
    return completionItems;
  }

  let blockDirPath = path.dirname(URI.parse(documentUri).fsPath);
  let absoluteImportPath = path.resolve(blockDirPath, relativeImportPath);
  let globPatternSuffix = relativeImportPath.endsWith("/") ? "/*" : "*";
  let blockSyntax = path.extname(documentUri);

  return new Promise(outerResolve => {
    glob(`${absoluteImportPath}${globPatternSuffix}`, async (_, pathNames) => {
      let items: (CompletionItem | null)[] = await Promise.all(pathNames.map(pathName => {
        return new Promise(innerResolve => {
          fs.stat(pathName, (_, stats) => {
            let completionKind: CompletionItemKind | undefined;

            if (stats.isDirectory()) {
              completionKind = CompletionItemKind.Folder;
            } else if (stats.isFile() && path.extname(pathName) === blockSyntax) {
              completionKind = CompletionItemKind.File;
            }

            if (!completionKind) {
              innerResolve(null);
            }

            innerResolve({
              label: path.basename(pathName),
              kind: completionKind,
            });
          });
        });
      }));

      // NOTE: it seems typescript is not happy with items.filter(Boolean)
      items.forEach(item => {
        if (item) {
          completionItems.push(item);
        }
      });

      outerResolve(completionItems);
    });
  });
}

// TODO: handle other completion cases (extending imported block, etc);
export async function getBlockCompletions(document: TextDocument, position: Position): Promise<CompletionItem[]> {
  let text = document.getText();
  let lineAtCursor = text.split(/\r?\n/)[position.line];
  let importPathMatches = lineAtCursor.match(LINK_REGEX);

  if (importPathMatches && shouldCompleteImportPath(importPathMatches, position, lineAtCursor)) {
    let relativeImportPath = importPathMatches[2];
    return await getImportPathCompletions(document.uri, relativeImportPath);
  }

  return [];
}
