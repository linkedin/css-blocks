import { ServerCapabilities, TextDocumentSyncKind } from "vscode-languageserver";

export const SERVER_CAPABILITIES: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Full,
  definitionProvider: true,
  // TODO: implement support for this for showing documentation
  // hoverProvider: true,
  documentLinkProvider: {
    resolveProvider: true,
  },
  documentSymbolProvider: false,
  completionProvider: {
    resolveProvider: false,
    "triggerCharacters": [ ":", '"', "=" ],
  },
};
