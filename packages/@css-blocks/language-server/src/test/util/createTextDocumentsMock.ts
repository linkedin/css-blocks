import { TextDocuments } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-types";

export function createTextDocumentsMock(documentsMap: Map<string, TextDocument>): TextDocuments {
  class TextDocumentsMock extends TextDocuments {
    get(uri: string): TextDocument | undefined {
      let textDocument = documentsMap.get(uri);
      return textDocument;
    }
  }

  return new TextDocumentsMock();
}
