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

interface PathCompletionCandidateInfo {
  pathName: string;
  stats: fs.Stats;
}

function maybeCompletionItem(completionCandidateInfo: PathCompletionCandidateInfo, currentFileExtension: string): CompletionItem | null {
    let completionKind: CompletionItemKind | undefined;

    if (completionCandidateInfo.stats.isDirectory()) {
      completionKind = CompletionItemKind.Folder;
    } else if (completionCandidateInfo.stats.isFile() && completionCandidateInfo.pathName.endsWith(`.block${currentFileExtension}`)) {
      completionKind = CompletionItemKind.File;
    }

    if (completionKind) {
      return {
        label: path.basename(completionCandidateInfo.pathName),
        kind: completionKind,
      };
    }

    return null;
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
  let currentFileExtension = path.extname(documentUri);

  let pathNames: string[] = await new Promise(r => {
    glob(`${absoluteImportPath}${globPatternSuffix}`, async (_, paths) => r(paths));
  });

  let fileInfos: PathCompletionCandidateInfo[] = await Promise.all(pathNames.map(pathName => {
    return new Promise(r => {
      fs.stat(pathName, (_, stats) => r({ pathName, stats }));
    });
  }));

  return fileInfos.reduce((completionItems: CompletionItem[], fileInfo) => {
    let completionItem = maybeCompletionItem(fileInfo, currentFileExtension);

    if (completionItem) {
      completionItems.push(completionItem);
    }

    return completionItems;
  },                      []);
}

// TODO: handle other completion cases (extending imported block, etc). Right
// this is only providing completions for import path;
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
