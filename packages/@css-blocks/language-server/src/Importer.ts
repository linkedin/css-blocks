import { NodeJsImporter, Configuration, ImportedFile } from "@css-blocks/core";
import { TextDocuments } from "vscode-languageserver";
import { URI } from "vscode-uri";

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

  async import(identifier: string, config: Configuration): Promise<ImportedFile> {
    // the uri expected is that of a file
    let clientDocument = this.documents.get(URI.file(identifier).toString());
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
