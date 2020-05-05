import { Configuration, ImportedCompiledCssFile, ImportedFile, Importer, NodeJsImporter, Syntax } from "@css-blocks/core";
import { TextDocuments } from "vscode-languageserver";
import { URI } from "vscode-uri";

/**
 * Imports the contents of the file from the language server client if its
 * already opened on the client. Otherwise, it proxies to the NodeJSImporter to
 * read the file from the disk
 */
export class LSImporter implements Importer {
  baseImporter: Importer;
  documents: TextDocuments;
  constructor(documents: TextDocuments, baseImporter?: Importer) {
    this.baseImporter = baseImporter || new NodeJsImporter();
    this.documents = documents;
  }

  async import(identifier: string, config: Configuration): Promise<ImportedFile | ImportedCompiledCssFile> {
    // the uri expected is that of a file
    let path = this.filesystemPath(identifier, config);
    let clientDocument = path && this.documents.get(URI.file(path).toString());
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
    // else import from the baseImporter
    return this.baseImporter.import(identifier, config);
  }
  identifier(fromIdentifier: string | null, importPath: string, config: Readonly<Configuration>): string {
    return this.baseImporter.identifier(fromIdentifier, importPath, config);
  }
  defaultName(identifier: string, configuration: Readonly<Configuration>): string {
    return this.baseImporter.defaultName(identifier, configuration);
  }
  filesystemPath(identifier: string, config: Readonly<Configuration>): string | null {
    return this.baseImporter.filesystemPath(identifier, config);
  }
  debugIdentifier(identifier: string, config: Readonly<Configuration>): string {
    return this.baseImporter.debugIdentifier(identifier, config);
  }
  syntax(identifier: string, config: Readonly<Configuration>): Syntax {
    return this.baseImporter.syntax(identifier, config);
  }
}
