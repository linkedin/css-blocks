import { NodeJsImporter } from "@css-blocks/core/dist/src";
import { TextDocuments } from "vscode-languageserver";

/**
 * Imports the contents of the file from the language server client if its
 * already opened on the client. Otherwise, it proxies to the NodeJSImporter to
 * read the file from the disk
 */
export class LSImporter extends NodeJsImporter {
  documents: TextDocuments;
  constructor(documents: TextDocuments) {
    super();
    this.documents = documents;
  }

  async import(identifier: string, config: Readonly<import("@css-blocks/core/dist/src").Configuration>): Promise<import("@css-blocks/core/dist/src").ImportedFile> {
    // the uri expected is that of a file
    let clientDocument = this.documents.get(`file://${identifier}`);
    // if the document is opened on the client, read from there
    // this will allow us to access the contents of an unsaved file
    if (clientDocument) {
      return {
        syntax: this.syntax(identifier, config),
        identifier,
        defaultName: this.defaultName(identifier, config),
        contents: clientDocument.getText(),
      };
    }
    // else import from the defaultImporter (which is the NodeJSImporter) as before
    return super.import(identifier, config);
  }
}
