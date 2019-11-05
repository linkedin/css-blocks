import * as path from "path";
import { DocumentLinkParams, TextDocuments } from "vscode-languageserver";
import { DocumentLink } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

import { isBlockFile } from "../util/blockUtils";

export const LINK_REGEX = /from\s+(['"])([^'"]+)\1;?/;

export async function blockLinksProvider(documents: TextDocuments, params: DocumentLinkParams): Promise<DocumentLink[]> {
  let { uri } = params.textDocument;

  if (!isBlockFile(uri)) {
    return [];
  }

  let document = documents.get(uri);

  if (!document) {
    return [];
  }

  let links: DocumentLink[] = [];
  let lines = document.getText().split(/\r?\n/);
  let blockDirPath = path.dirname(URI.parse(uri).fsPath);

  lines.forEach((line, lineIndex) => {
    let matches = line.match(LINK_REGEX);

    if (!matches) {
      return;
    }

    let relativeBlockReferencePath = matches[2];
    let absoluteBlockReferencePath = path.resolve(blockDirPath, relativeBlockReferencePath);
    let startColumn = line.indexOf(relativeBlockReferencePath);
    let endColumn = startColumn + relativeBlockReferencePath.length;

    links.push({
      target: URI.file(absoluteBlockReferencePath).toString(),
      range: {
        start: { line: lineIndex, character: startColumn },
        end: { line: lineIndex, character: endColumn },
      },
    });
  });

  return links;
}
