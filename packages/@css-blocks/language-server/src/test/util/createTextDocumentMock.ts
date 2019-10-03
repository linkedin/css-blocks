import * as fs from "fs";
import * as path from "path";
import { TextDocument } from "vscode-languageserver";
import { Position, Range } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

export interface TextDocumentMockParams {
  uri: string;
  languageId: string;
  version: number;
  lineCount: number;
  fixtureText: string;
}

export class TextDocumentMock implements TextDocument {
  uri: string;
  languageId: string;
  version: number;
  lineCount: number;
  fixtureText: string;

  constructor(params: TextDocumentMockParams) {
    this.uri = params.uri;
    this.languageId = params.languageId;
    this.version = params.version;
    this.lineCount = params.lineCount;
    this.fixtureText = params.fixtureText;
  }

  getText(_range?: Range | undefined): string {
    return this.fixtureText;
  }

  positionAt(_offset: number): Position {
    throw new Error("Method not implemented.");
  }

  offsetAt(_position: Position): number {
    throw new Error("Method not implemented.");
  }
}

interface LanguageIds {
  [key: string]: string;
}

const extensionToLanguageMap: LanguageIds = {
  js: "javascript",
  ts: "typescript",
  hbs: "handlebars",
  css: "css",
};

export function createTextDocumentMock(uri: string): TextDocument {
  let text = fs.readFileSync(URI.parse(uri).fsPath, { encoding: "utf8" });

  return new TextDocumentMock({
    uri,
    fixtureText: text,
    version: 1,
    lineCount: text.split(/\r?\n/).length,
    languageId: extensionToLanguageMap[path.extname(uri)] || "",
  }) as TextDocument;
}
