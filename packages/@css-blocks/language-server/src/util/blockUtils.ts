import { CssBlockError, Syntax } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import * as fs from "fs";
import { postcss } from "opticss";
import * as path from "path";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver";
import { URI } from "vscode-uri";

const IMPORT_PATH_REGEX = /from\s+(['"])([^'"]+)/;

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

/**
 * We only return folders/directories or block files as completion items.
 */
function maybeCompletionItem(completionCandidateInfo: PathCompletionCandidateInfo): CompletionItem | null {
  let completionKind: CompletionItemKind | undefined;
  let isBlockFile = (candidate: PathCompletionCandidateInfo) => candidate.pathName.indexOf(".block.") >= 0;

  if (completionCandidateInfo.stats.isDirectory()) {
    completionKind = CompletionItemKind.Folder;
  } else if (completionCandidateInfo.stats.isFile() && isBlockFile(completionCandidateInfo)) {
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

function getFilesInDirectory(directoryPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    fs.readdir(directoryPath, (error, fileNames) => {
      error ? resolve([]) : resolve(fileNames);
    });
  });
}

function getStatsForFile(filePath: string): Promise<fs.Stats | null> {
  return new Promise((resolve) => {
    fs.stat(filePath, (error, stats) => {
      error ? resolve(null) : resolve(stats);
    });
  });
}

async function getImportPathCompletions(documentUri: string, relativeImportPath: string): Promise<CompletionItem[]> {
  let completionItems: CompletionItem[] = [];

  // if the user has only typed leading dots, don't complete anything.
  if (/^\.+$/.test(relativeImportPath)) {
    return completionItems;
  }

  let blockDirPath = path.dirname(URI.parse(documentUri).fsPath);
  let relativeScanDir = relativeImportPath.endsWith(path.sep) ? relativeImportPath : relativeImportPath.substring(0, relativeImportPath.lastIndexOf(path.sep) + 1);
  let absoluteScanDir = path.resolve(blockDirPath, relativeScanDir);
  let blockFsPath = URI.parse(documentUri).fsPath;
  let fileNames: string[] = await getFilesInDirectory(absoluteScanDir);

  let completionCandidates: (PathCompletionCandidateInfo | null)[] = await Promise.all(
    fileNames.map(async (fileName): Promise<PathCompletionCandidateInfo | null> => {
      let absolutePath = `${absoluteScanDir}/${fileName}`;
      let stats: fs.Stats | null = await getStatsForFile(absolutePath);

      return stats ? {
        pathName: absolutePath,
        stats,
      } : null;
    }));

  return completionCandidates.reduce(
    (completionItems: CompletionItem[], candidate) => {
      if (!candidate || candidate.pathName === blockFsPath) {
        return completionItems;
      }

      let completionItem = maybeCompletionItem(candidate);

      if (completionItem) {
        completionItems.push(completionItem);
      }

      return completionItems;
    },
    []);
}

// TODO: handle other completion cases (extending imported block, etc). Right
// this is only providing completions for import path;
export async function getBlockCompletions(document: TextDocument, position: Position): Promise<CompletionItem[]> {
  let text = document.getText();
  let lineAtCursor = text.split(/\r?\n/)[position.line];
  let importPathMatches = lineAtCursor.match(IMPORT_PATH_REGEX);

  if (importPathMatches && shouldCompleteImportPath(importPathMatches, position, lineAtCursor)) {
    let relativeImportPath = importPathMatches[2];
    return await getImportPathCompletions(document.uri, relativeImportPath);
  }

  return [];
}
