import { search as searchForConfig } from "@css-blocks/config";
import { BlockFactory, Configuration, CssBlockError, resolveConfiguration } from "@css-blocks/core";
import { CompletionItem, Definition, DidChangeConfigurationNotification, DocumentLink, DocumentLinkParams, IConnection, InitializeParams, InitializeResult, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { emberCompletionProvider } from "./completionProviders/emberCompletionProvider";
import { createBlockFactory } from "./createBlockFactory";
import { emberDefinitionProvider } from "./definitionProviders/emberDefinitionProvider";
import { blockLinksProvider } from "./documentLinksProviders/blockLinkProvider";
import { documentContentChange } from "./eventHandlers/documentContentChange";
import { LSImporter } from "./Importer";
import { PathTransformer } from "./pathTransformers/PathTransformer";
import { SERVER_CAPABILITIES } from "./serverCapabilities";
import { isBlockFile } from "./util/blockUtils";
import { convertErrorsToDiagnostics } from "./util/diagnosticsUtils";
import { isTemplateFile, validateTemplates } from "./util/hbsUtils";

export class Server {
  _blockFactory: BlockFactory | undefined;
  _config: Readonly<Configuration> | undefined;
  connection: IConnection;
  documents: TextDocuments;
  pathTransformer: PathTransformer;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;

  constructor(connection: IConnection, documents: TextDocuments, pathTransformer: PathTransformer) {
    this.connection = connection;
    this.documents = documents;
    this.pathTransformer = pathTransformer;

    this.registerDocumentEvents();
    this.registerConnectionEvents();
  }

  get config(): Readonly<Configuration> {
    if (!this._config) {
      this._config = resolveConfiguration({});
    }
    return this._config;
  }

  get blockFactory(): BlockFactory {
    if (!this._blockFactory) {
      this._blockFactory = createBlockFactory(this.config);
    }
    return this._blockFactory;
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
      this.blockFactory.reset();
      if (isBlockFile(e.document.uri)) {
        const cssBlockErrors = await documentContentChange(e, this.blockFactory);
        this.sendDiagnostics(cssBlockErrors, e.document.uri);

      } else if (isTemplateFile(e.document.uri)) {
        // Validate template
        // NOTE: this does seem to cause a little bit of weirdness when editing a
        // template with errors since the error locations do not get updated until
        // saving the file. We may want to validate the open template files on
        // every change?
      }

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

  private async onConnectionInitialize(params: InitializeParams): Promise<InitializeResult> {
    let capabilities = params.capabilities;
    let options: Partial<Configuration>;

    // TODO #1: We need to spin up a server per workspace folder.
    // TODO #1: Then the rootUri should come in as part of the constructor params.
    // TODO #1: But the rest of the config lookup logic should remain basically the same.
    // TODO #2: There should be a configuration option to set the rootDir for CSS Blocks
    // TODO #2: as well as a configuration option to set the configuration file explicitly
    // TODO #2: instead of only doing a search for the configuration file.
    let result: Partial<Configuration> | null = null;
    let rootDir: string | null = null;
    if (params.workspaceFolders) {
      for (let wsFolder of params.workspaceFolders) {
        let folderPath = URI.parse(wsFolder.uri).fsPath;
        result = await searchForConfig(folderPath);
        if (result) {
          rootDir = folderPath;
          break;
        }
      }
    } else if (params.rootPath) {
      rootDir = params.rootPath;
      result = await searchForConfig(params.rootPath);
    }
    options = result || (rootDir ? {rootDir} : {});
    options.importer = new LSImporter(this.documents, options.importer);
    this._config = resolveConfiguration(options);
    this._blockFactory = createBlockFactory(this._config);

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
