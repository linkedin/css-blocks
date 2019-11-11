import { BlockFactory, CssBlockError } from "@css-blocks/core/dist/src";
import { TextDocumentChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { isBlockFile } from "../util/blockUtils";

export async function documentContentChange(e: TextDocumentChangeEvent, blockFactory: BlockFactory): Promise<CssBlockError[]> {
  const { uri } = e.document;

  if (isBlockFile(uri)) {
    let errors: CssBlockError[] = [];
    try {
      // parses the block file to get the block and errors if there's a problem
      // along the way. The importer ensures that we're getting live contents if
      // the block file is opened
      await blockFactory.getBlockFromPath(URI.parse(uri).fsPath);
    } catch (error) {
      return error instanceof CssBlockError ? [error] : [];
    }
  }
  return [];
}
