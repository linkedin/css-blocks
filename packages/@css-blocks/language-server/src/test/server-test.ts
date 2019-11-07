import { Syntax } from "@css-blocks/core/dist/src";
import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";
import * as path from "path";
import { CompletionItemKind, CompletionRequest, DefinitionRequest, DiagnosticSeverity, DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams, DocumentLinkParams, DocumentLinkRequest, IConnection, TextDocument, TextDocumentPositionParams, TextDocuments, createConnection } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { EmberClassicTransformer } from "../pathTransformers/EmberClassicTransformer";
import { PathTransformer } from "../pathTransformers/PathTransformer";
import { Server } from "../Server";
import { transformPathsFromUri } from "../util/pathTransformer";

import { createTextDocumentMock } from "./util/createTextDocumentMock";
import { createTextDocumentsMock } from "./util/createTextDocumentsMock";
import { TestStream } from "./util/TestStream";

const TEST_DIR = path.resolve(__dirname, "..", "..", "src", "test");
const pathToUri = (relativePath: string) => URI.file(path.resolve(TEST_DIR, relativePath)).toString();

const EMBER_CLASSIC_TEMPLATE_A_URI = pathToUri("fixtures/ember-classic/templates/components/a.hbs");
const EMBER_CLASSIC_BLOCK_A_URI = pathToUri("fixtures/ember-classic/styles/components/a.block.css");

@suite("Language Server | Server | tags: ember-classic, language-server")
export class LanguageServerServerTest {
  mockServerConnection: IConnection;
  mockClientConnection: IConnection;
  documents: TextDocuments;
  pathTransformer: PathTransformer;

  constructor() {
    const input = new TestStream();
    const output = new TestStream();

    this.mockServerConnection = createConnection(input, output);
    this.mockClientConnection = createConnection(output, input);
    this.mockClientConnection.listen();

    const textDocumentsByUri = new Map<string, TextDocument>();
    textDocumentsByUri.set(EMBER_CLASSIC_TEMPLATE_A_URI, createTextDocumentMock(EMBER_CLASSIC_TEMPLATE_A_URI));
    textDocumentsByUri.set(EMBER_CLASSIC_BLOCK_A_URI, createTextDocumentMock(EMBER_CLASSIC_BLOCK_A_URI));

    this.documents = createTextDocumentsMock(textDocumentsByUri);
    this.pathTransformer = new EmberClassicTransformer(Syntax.css);
  }

  private startServer() {
    const server = new Server(this.mockServerConnection, this.documents, this.pathTransformer);

    server.listen();

    return server;
  }

  @test async "it returns the expected definitions for local block"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 0,
        character: 17,
      },
    };

    const response = await this.mockClientConnection.sendRequest(DefinitionRequest.type, params);

    assert.deepEqual(response, {
      uri: transformPathsFromUri(EMBER_CLASSIC_TEMPLATE_A_URI, this.pathTransformer).blockUri || "",
      range: {
        start: { line: 6, character: 1 },
        end: { line: 6, character: 1 },
      },
    });
  }

  @test async "it returns the expected definitions for a class that is defined as part of a multiline string"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 3,
        character: 5,
      },
    };

    const response = await this.mockClientConnection.sendRequest(DefinitionRequest.type, params);

    assert.deepEqual(response, {
      uri: transformPathsFromUri(EMBER_CLASSIC_TEMPLATE_A_URI, this.pathTransformer).blockUri || "",
      range: {
        start: { line: 10, character: 1 },
        end: { line: 10, character: 1 },
      },
    });
  }

  @test async "it returns the expected definitions for a block reference"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 1,
        character: 19,
      },
    };

    const response = await this.mockClientConnection.sendRequest(DefinitionRequest.type, params);

    assert.deepEqual(response, {
      uri: pathToUri("fixtures/ember-classic/styles/blocks/utils.block.css"),
      range: {
        start: { line: 4, character: 1 },
        end: { line: 4, character: 1 },
      },
    });
  }

  @test async "it returns no definitions when triggering go to definition on a class that has not been defined"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 5,
        character: 17,
      },
    };

    const response = await this.mockClientConnection.sendRequest(DefinitionRequest.type, params);

    assert.deepEqual(response, []);
  }

  @test async "it returns the expected completions for local block"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 0,
        character: 17,
      },
    };

    const response = await this.mockClientConnection.sendRequest(CompletionRequest.type, params);
    const expectedCompletionKind = CompletionItemKind.Property;

    assert.deepEqual(response, [{ label: "a-1", kind: expectedCompletionKind },
                                { label: "a-2", kind: expectedCompletionKind },
                                { label: "a-3", kind: expectedCompletionKind }]);
  }

  @test async "it returns the expected completions for a block reference"() {
    this.startServer();

    const params: TextDocumentPositionParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      },
      position: {
        line: 1,
        character: 20,
      },
    };

    const response = await this.mockClientConnection.sendRequest(CompletionRequest.type, params);
    const expectedCompletionKind = CompletionItemKind.Property;

    assert.deepEqual(response, [{ label: "display-flex", kind: expectedCompletionKind },
                                { label: "display-block", kind: expectedCompletionKind },
    ]);
  }

  @test async "it returns the expected template diagnostics for a class that is not defined when a file is opened"() {
    this.startServer();

    const document = this.documents.get(EMBER_CLASSIC_TEMPLATE_A_URI)!;

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
        version: 1,
        text: document.getText(),
        languageId: "handlebars",
      },
    };

    this.mockClientConnection.sendNotification(DidOpenTextDocumentNotification.type, params);

    let publishParams = await new Promise((resolve) => {
      this.mockClientConnection.onNotification((method, params) => {
        if (method === "textDocument/publishDiagnostics") {
          if (params.diagnostics.length) {
            resolve(params);
          }
        }
      });
    });

    assert.deepEqual(publishParams, {
      uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      diagnostics: [{
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 5,
            character: 17,
          },
          end: {
            line: 5,
            character: 33,
          },
        },
        message: "Class name 'i-do-not-exist-1' not found.",
      },            {
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 6,
            character: 26,
          },
          end: {
            line: 6,
            character: 42,
          },
        },
        message: "Class name 'i-do-not-exist-2' not found.",
      }],
    });
  }

  // TODO: figure out why the client does not receive the notification after
  // sending synthetic save event. This is pretty much covered by the properly
  // functioning "onDidOpen" test, and the "ondDidSave" event is reliably fired
  // under real working conditions.
  @skip async "it returns the expected template diagnostics when using a class that is not defined when a file is saved"() {
    this.startServer();

    const document = this.documents.get(EMBER_CLASSIC_TEMPLATE_A_URI)!;

    const params: DidSaveTextDocumentParams = {
      textDocument: {
        uri: EMBER_CLASSIC_TEMPLATE_A_URI,
        version: 2,
      },
      text: document.getText(),
    };

    this.mockClientConnection.sendNotification(DidSaveTextDocumentNotification.type, params);

    let publishParams = await new Promise((resolve) => {
      this.mockClientConnection.onNotification((method, params) => {
        if (method === "textDocument/publishDiagnostics") {
          if (params.diagnostics.length) {
            resolve(params);
          }
        }
      });
    });

    assert.deepEqual(publishParams, {
      uri: EMBER_CLASSIC_TEMPLATE_A_URI,
      diagnostics: [{
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 14,
          },
          end: {
            line: 0,
            character: 32,
          },
        },
        message: 'No Style ".non-existent-class" found on Block "a".',
      }],
    });
  }

  @test async "it returns the expected css block diagnostics when a block file is changed"() {
    const server = this.startServer();
    const blockWithErrorsUri = pathToUri("fixtures/ember-classic/styles/blocks/block-with-errors.block.css");
    await server.onDidChangeContent({
      document: createTextDocumentMock(blockWithErrorsUri),
    });

    let publishParams = await new Promise((resolve) => {
      this.mockClientConnection.onNotification((method, params) => {
        if (method === "textDocument/publishDiagnostics") {
          if (params.diagnostics.length) {
            resolve(params);
          }
        }
      });
    });

    assert.deepEqual(publishParams, {
      uri: blockWithErrorsUri,
      diagnostics: [{
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 4,
            character: 2,
          },
          end: {
            line: 4,
            character: 4,
          },
        },
        message: "Two distinct classes cannot be selected on the same element: .a.b",
      }],
    });

  }

  @test async "it returns the expected document links"() {
    this.startServer();

    let params: DocumentLinkParams = {
      textDocument: {
        uri: pathToUri("fixtures/ember-classic/styles/components/a.block.css"),
      },
    };

    let response = await this.mockClientConnection.sendRequest(DocumentLinkRequest.type, params);

    assert.deepEqual(response, [{
      range: {
        start: {
          character: 19,
          line: 0,
        },
        end: {
          character: 44,
          line: 0,
        },
      },
      target: pathToUri("fixtures/ember-classic/styles/blocks/utils.block.css"),
    }]);
  }

  @test async "it returns the expected completions for a block/export path in a block file"() {
    const textDocumentsByUri = new Map<string, TextDocument>();
    const importCompletionsFixtureUri = pathToUri("fixtures/ember-classic/styles/components/import-completions.block.css");
    textDocumentsByUri.set(importCompletionsFixtureUri, createTextDocumentMock(importCompletionsFixtureUri));
    this.documents = createTextDocumentsMock(textDocumentsByUri);

    this.startServer();

    // directory completions
    const params1: TextDocumentPositionParams = {
      textDocument: {
        uri: importCompletionsFixtureUri,
      },
      position: {
        line: 0,
        character: 27,
      },
    };

    const response1 = await this.mockClientConnection.sendRequest(CompletionRequest.type, params1);

    assert.deepEqual(
      response1, [
      {
        kind: 19,
        label: "blocks",
      },
      {
        kind: 19,
        label: "components",
      },
    ],
      "it returns the expected folder completions");

    // file name completions
    const params2: TextDocumentPositionParams = {
      textDocument: {
        uri: importCompletionsFixtureUri,
      },
      position: {
        line: 1,
        character: 30,
      },
    };

    const response2 = await this.mockClientConnection.sendRequest(CompletionRequest.type, params2);

    assert.deepEqual(
      response2, [
      {
        "kind": 17,
        "label": "block-with-errors.block.css",
      },
      {
        "kind": 17,
        "label": "utils.block.css",
      },
    ],
      "it returns the expected file completions");

    // partially typed filename completion
    const params3: TextDocumentPositionParams = {
      textDocument: {
        uri: importCompletionsFixtureUri,
      },
      position: {
        line: 2,
        character: 32,
      },
    };

    const response3 = await this.mockClientConnection.sendRequest(CompletionRequest.type, params3);

    assert.deepEqual(
      response3, [
      {
        kind: 17,
        label: "block-with-errors.block.css",
      },
      {
        kind: 17,
        label: "utils.block.css",
      },
    ],
      "it returns the expected file completions");

    // local directory reference
    const params4: TextDocumentPositionParams = {
      textDocument: {
        uri: importCompletionsFixtureUri,
      },
      position: {
        line: 3,
        character: 23,
      },
    };

    const response4 = await this.mockClientConnection.sendRequest(CompletionRequest.type, params4);

    assert.deepEqual(
      response4, [
      {
        kind: 17,
        label: "a.block.css",
      },
    ],
      "it returns the expected file completions");
  }
}
