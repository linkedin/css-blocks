import { CssBlockError } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import { TextDocumentChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { isBlockFile, parseBlockErrors } from "../util/blockUtils";

export async function documentContentChange(e: TextDocumentChangeEvent, parser: BlockParser): Promise<CssBlockError[]> {
  const { uri } = e.document;

  if (isBlockFile(uri)) {
    return await parseBlockErrors(parser, URI.parse(uri).fsPath, e.document.getText());
  }

  return [];
}
