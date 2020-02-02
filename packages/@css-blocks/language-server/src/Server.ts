import { search as searchForConfig } from "@css-blocks/config";
import { BlockFactory, Configuration, CssBlockError, Syntax, resolveConfiguration } from "@css-blocks/core";
import { GlimmerAnalyzer } from "@css-blocks/glimmer";
import * as glob from "glob";
import * as path from "path";
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
import { findStyleSheetSourceLocation } from "./util/hbsDefinitionProvider";
import { ClassAttribute, getItemAtCursor, isTemplateFile, validateTemplates } from "./util/hbsUtils";

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
      const workspaceFolders = await this.connection.workspace.getWorkspaceFolders();

      if (!workspaceFolders) {
        return locations;
      }

      if (isTemplateFile(uri)) {
        let document = this.documents.get(params.textDocument.uri);
        if (!document) {
          return locations;
        }

        let itemAtCursor = getItemAtCursor(document.getText(), params.position);
        if (!itemAtCursor) {
          return locations;
        }

        const localBlockName = (uri.split("templates/components/").pop() || "").split(".").shift();
        const blockName = itemAtCursor.attribute.referencedBlock || localBlockName;
        const attributeValue = (itemAtCursor.attribute as ClassAttribute).name;

        let analyzer = new GlimmerAnalyzer(this.blockFactory, {});

        // TODO: for v1 we are assuming a single directory workspace where the root
        // represents the path to an ember application. In a follow up we should handle
        // multi-root workspaces and workspaces that may contain the ember app in a nested
        // directory.
        const rootDir = URI.parse(workspaceFolders[0].uri).fsPath;
        const templates = glob.sync("**/*.hbs", { ignore: ["**/node_modules/**"], cwd: rootDir });
        let references: Location[] = [];
        let analyses;

        try {
          analyses = await analyzer.analyze(rootDir, templates);
        } catch (e) {
          console.log(e);
          return references;
        }

        // first lets resolve the stylesheet reference. NOTE: This is currently
        // naive in that it doesn't account for extensions in other block files.
        const blockPath = this.pathTransformer.templateToBlock(URI.parse(uri).fsPath);
        if (blockPath) {
          const stylesheetLocation = await findStyleSheetSourceLocation(blockPath, this.blockFactory, itemAtCursor);
          if (stylesheetLocation) {
            locations.push(stylesheetLocation);
          }
        }

        // next we'll find all of the template references
        analyses.eachAnalysis(templateAnalysis => {
          templateAnalysis.elements.forEach(elementAnalysis => {
            const staticStyles = elementAnalysis.getAllStaticStyles();

            for (let staticStyle of staticStyles) {
              if (staticStyle.name === attributeValue && staticStyle.block.name === blockName) {
                // TODO: Right now this is pushing the location of the element that has the attribute.
                // In a follow up we should capture more granular source locations for attribute nodes
                // in order to make the search results displayed in the UI more accurate.
                locations.push({
                  uri: URI.file(path.resolve(rootDir, templateAnalysis.template.identifier)).toString(),
                  range: {
                    start: {
                      line: elementAnalysis.sourceLocation.start.line - 1,
                      character: elementAnalysis.sourceLocation.start.column || 0,
                    },
                    end: {
                      line: elementAnalysis.sourceLocation.end!.line - 1,
                      character: elementAnalysis.sourceLocation.end!.column || 0,
                    },
                  },
                });
              }
            }
          });
        });
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
    options = result || (rootDir ? { rootDir } : {});
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
