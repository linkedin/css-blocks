import { BlockFactory } from "@css-blocks/core/dist/src";
import { CompletionItem, TextDocumentPositionParams, TextDocuments } from "vscode-languageserver";

import { PathTransformer } from "../pathTransformers/PathTransformer";
import { getHbsCompletions } from "../util/hbsCompletionProvider";
import { isTemplateFile } from "../util/hbsUtils";

export async function emberCompletionProvider(documents: TextDocuments, factory: BlockFactory, params: TextDocumentPositionParams, pathTransformer: PathTransformer): Promise<CompletionItem[]> {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    if (isTemplateFile(document.uri)) {
      return await getHbsCompletions(document, params.position, factory, pathTransformer);
    }
  }
  return [];
}
