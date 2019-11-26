import { search as searchForConfig } from "@css-blocks/config";
import { BlockFactory, Configuration, CssBlockError, Syntax, resolveConfiguration } from "@css-blocks/core";
import { CompletionItem, Definition, DidChangeConfigurationNotification, DocumentLink, DocumentLinkParams, IConnection, InitializeParams, InitializeResult, Location, ReferenceParams, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { emberCompletionProvider } from "./completionProviders/emberCompletionProvider";
import { createBlockFactory } from "./createBlockFactory";
import { emberDefinitionProvider } from "./definitionProviders/emberDefinitionProvider";
import { blockLinksProvider } from "./documentLinksProviders/blockLinkProvider";
import { documentContentChange } from "./eventHandlers/documentContentChange";
import { LSImporter } from "./Importer";
import { EmberClassicTransformer } from "./pathTransformers/EmberClassicTransformer";
import { PathTransformer } from "./pathTransformers/PathTransformer";
import { SERVER_CAPABILITIES } from "./serverCapabilities";
import { isBlockFile } from "./util/blockUtils";
import { convertErrorsToDiagnostics } from "./util/diagnosticsUtils";
import { isTemplateFile, validateTemplates } from "./util/hbsUtils";

export class Server {
  _blockFactory: BlockFactory | undefined;
  _config: Readonly<Configuration> | undefined;
  _pathTransformer: PathTransformer | undefined;
  connection: IConnection;
  documents: TextDocuments;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;

  constructor(connection: IConnection, documents: TextDocuments) {
    this.connection = connection;
    this.documents = documents;

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

  get pathTransformer(): PathTransformer {
    if (!this._pathTransformer) {
      let syntaxes = new Array<Syntax>();
      let keys = Object.keys(this.config.preprocessors);
      for (let k of keys) {
        if (Syntax[k]) {
          syntaxes.push(Syntax[k]);
        }
      }
      if (!syntaxes.includes(Syntax.css)) {
        syntaxes.push(Syntax.css);
      }
      this._pathTransformer = new EmberClassicTransformer(syntaxes);
    }
    return this._pathTransformer;
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
      if (isBlockFile(e.document.uri, this.config)) {
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

    this.connection.onReferences(async (params: ReferenceParams): Promise<Location[]> => {
      let uri = params.textDocument.uri;
      let locations: Location[] = [];

      // TODO: construct glimmer analyzer and see what information we currently
      // have to work with.
      if (isTemplateFile(uri)) {
        let document = this.documents.get(params.textDocument.uri);
        if (!document) {
          return locations;
        }
      }

      return locations;
    });

    this.connection.onDocumentLinks(async (params: DocumentLinkParams): Promise<DocumentLink[]> => {
      return await blockLinksProvider(this.documents, params, this.config);
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
    // We set both of these explicitly here just in case they were accessed
    // before initialization.
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
