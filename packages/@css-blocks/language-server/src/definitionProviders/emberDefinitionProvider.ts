import { BlockFactory } from "@css-blocks/core/dist/src";
import { Definition, TextDocumentPositionParams, TextDocuments } from "vscode-languageserver";

import { PathTransformer } from "../pathTransformers/PathTransformer";
import { getHbsDefinition } from "../util/hbsDefinitionProvider";
import { isTemplateFile } from "../util/hbsUtils";

export async function emberDefinitionProvider(documents: TextDocuments, factory: BlockFactory, params: TextDocumentPositionParams, pathTransformer: PathTransformer): Promise<Definition> {
  let {
    position,
    textDocument: { uri },
  } = params;
  let document = documents.get(uri);

  if (document) {
    if (isTemplateFile(uri)) {
      return await getHbsDefinition(document, position, factory, pathTransformer);
    }
  }

  return [];
}
