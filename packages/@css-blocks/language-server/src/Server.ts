import { BlockFactory, CssBlockError, Options, resolveConfiguration } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import { CompletionItem, Definition, DidChangeConfigurationNotification, DocumentLink, DocumentLinkParams, IConnection, InitializeParams, InitializeResult, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments } from "vscode-languageserver";

import { emberCompletionProvider } from "./completionProviders/emberCompletionProvider";
import { createBlockFactory } from "./createBlockFactory";
import { createBlockParser } from "./createBlockParser";
import { emberDefinitionProvider } from "./definitionProviders/emberDefinitionProvider";
import { blockLinksProvider } from "./documentLinksProviders/blockLinkProvider";
import { documentContentChange } from "./eventHandlers/documentContentChange";
import { PathTransformer } from "./pathTransformers/PathTransformer";
import { SERVER_CAPABILITIES } from "./serverCapabilities";
import { isBlockFile } from "./util/blockUtils";
import { convertErrorsToDiagnostics } from "./util/diagnosticsUtils";
import { validateTemplates } from "./util/hbsUtils";

export class Server {
  connection: IConnection;
  documents: TextDocuments;
  blockFactory: BlockFactory;
  blockParser: BlockParser;
  pathTransformer: PathTransformer;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;

  constructor(connection: IConnection, documents: TextDocuments, pathTransformer: PathTransformer, cssBlocksOptions?: Options) {
    this.connection = connection;
    this.documents = documents;
    this.pathTransformer = pathTransformer;

    // NOTE: creating these instances directly in the constructor because we
    // don't currently have a need to expose them for mocking in testing.
    const config = resolveConfiguration(cssBlocksOptions);
    let blockFactory = createBlockFactory(config);
    this.blockFactory = blockFactory;
    this.blockParser = createBlockParser(config, blockFactory);

    this.registerDocumentEvents();
    this.registerConnectionEvents();
  }

  listen() {
    this.documents.listen(this.connection);
    this.connection.listen();
  }

  async validateTemplates() {
      this.blockFactory.reset();
      let templateUriToErrors = await validateTemplates(this.documents, this.blockFactory, this.pathTransformer);
      this.distributeDiagnostics(templateUriToErrors);
  }

  async onDidChangeContent(e: TextDocumentChangeEvent) {
      // only track incremental changes within block files
      // NOTE: this does seem to cause a little bit of weirdness when editing a
      // template with errors since the error locations do not get updated until
      // saving the file. We may want to validate the open template files on
      // every change?
      if (!isBlockFile(e.document.uri)) {
        return;
      }

      const cssBlockErrors = await documentContentChange(e, this.blockParser);
      this.sendDiagnostics(cssBlockErrors, e.document.uri);
  }

  private registerDocumentEvents() {
    this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
    this.documents.onDidSave(this.validateTemplates.bind(this));
    this.documents.onDidOpen(this.validateTemplates.bind(this));
  }

  // TODO: decide providers based on configuration
  private registerConnectionEvents() {
    this.connection.onInitialize(this.onConnectionInitialize.bind(this));
    this.connection.onInitialized(this.afterConnectionInitialized.bind(this));

    this.connection.onCompletion(async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
      return await emberCompletionProvider(this.documents, this.blockFactory, params, this.pathTransformer);
    });

    this.connection.onDefinition(async (params: TextDocumentPositionParams): Promise<Definition> => {
      return await emberDefinitionProvider(this.documents, this.blockFactory, params, this.pathTransformer);
    });

    this.connection.onDocumentLinks(async (params: DocumentLinkParams): Promise<DocumentLink[]> => {
      return await blockLinksProvider(this.documents, params);
    });
  }

  private onConnectionInitialize(params: InitializeParams): InitializeResult {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    this.hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    return {
      capabilities: SERVER_CAPABILITIES,
    };
  }

  private afterConnectionInitialized() {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
    }
    if (this.hasWorkspaceFolderCapability) {
      this.connection.workspace.onDidChangeWorkspaceFolders(_event => {
        this.connection.console.log("Workspace folder change event received.");
      });
    }
  }

  private distributeDiagnostics(uriToErrorsMap: Map<string, CssBlockError[]>) {
    uriToErrorsMap.forEach(this.sendDiagnostics.bind(this));
  }

  private sendDiagnostics(errors: CssBlockError[], uri: string) {
    this.connection.sendDiagnostics({
      uri,
      diagnostics: convertErrorsToDiagnostics(errors),
    });
  }
}
