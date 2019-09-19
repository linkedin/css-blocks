import {
  createConnection,
  TextDocuments,
  // TextDocument,
  // Diagnostic,
  // DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  // TextDocumentSyncKind,
  // DidChangeTextDocumentParams,
  // Range
} from "vscode-languageserver";
import { postcss } from "opticss";
import {
  // Attribute,
  Block,
  // BlockClass,
  BlockFactory,
  // Options,
  // isBlockClass,
  resolveConfiguration,
  Syntax,
  CssBlockError,
  // errorHasRange,
  SourceRange
} from "@css-blocks/core";
import * as path from "path";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import { DiagnosticsManager } from "./services/diagnostics";

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);
const diagnostics = new DiagnosticsManager(connection);

// Initialize simple documents manager
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  // hasDiagnosticRelatedInformationCapability = !!(
  //   capabilities.textDocument &&
  //   capabilities.textDocument.publishDiagnostics &&
  //   capabilities.textDocument.publishDiagnostics.relatedInformation
  // );

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true,
      documentSymbolProvider: false,
      completionProvider: {
        resolveProvider: true
      }
    }
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
// let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(_change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    // globalSettings = <ExampleSettings>(
    //   (change.settings.cssBlocksLanguageServer || defaultSettings)
    // );
  }

  // Revalidate all open text documents
  // documents.all().forEach(validateDocument);
});

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
//   if (!hasConfigurationCapability) {
//     return Promise.resolve(globalSettings);
//   }
//   let result = documentSettings.get(resource);
//   if (!result) {
//     result = connection.workspace.getConfiguration({
//       scopeUri: resource,
//       section: "cssBlocksLanguageServer"
//     });
//     documentSettings.set(resource, result);
//   }
//   return result;
// }

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted when the
// text document is first opened or when its content has changed. When the document
// is opened we receive the full text. On subsequent edits we only get the
// changed text.
const config = resolveConfiguration({});
const factory = new BlockFactory(config, postcss);
const parser = new BlockParser(config, factory);

documents.onDidChangeContent(async change => {
  const uri = change.document.uri;
  // TODO: figure out why this is not working and use it instead of the
  // following replace hack
  // const filepath = url.fileURLToPath(uri);
  const filepath = uri.replace(/^file:\/\//, "");
  const text = change.document.getText();
  const extension = filepath.split(".").pop();

  switch (extension) {
    case "hbs":
      const blockPath = filepath
        .replace(/.hbs$/, ".block.css")
        .replace(
          new RegExp(`${path.sep}templates${path.sep}`),
          `${path.sep}styles${path.sep}`
        );
      let block: Block;

      try {
        block = await factory.getBlockFromPath(blockPath);
        interface CSSClassPosition {
          className: string;
          range: SourceRange;
        }

        let classes: CSSClassPosition[] = [];
        let match: RegExpExecArray | null;

        const regex = /class=('|")([^"']*)\1/g;
        const lines = text.split(/\r?\n/);

        lines.forEach((line, index) => {
          while ((match = regex.exec(line))) {
            let previousClassName = "";
            let matchIndexOffset = 8;

            match[2].split(" ").forEach(className => {
              if (match === null) {
                return;
              }

              matchIndexOffset += previousClassName
                ? previousClassName.length + 1
                : 0;

              classes.push({
                className,
                range: {
                  start: {
                    line: index + 1,
                    column: match.index + matchIndexOffset
                  },
                  end: {
                    line: index + 1,
                    column:
                      match.index + matchIndexOffset + className.length - 1
                  }
                }
              });

              previousClassName = className;
            });
          }
        });

        let errors: CssBlockError[] = [];

        classes.forEach(obj => {
          try {
            const blockName = obj.className.includes(".")
              ? obj.className
              : `.${obj.className}`;
            block.lookup(blockName, obj.range);
          } catch (error) {
            errors.push(error);
          }
        });

        if (errors.length > 0) {
          await diagnostics.sendDiagnostics(errors, uri);
        }
      } catch (e) {
        // whatever
      }

    case "css":
      if (!filepath.match(/\.block\.css/)) break;
      try {
        await parser.parseSource({
          identifier: filepath,
          defaultName: path.parse(filepath).name.replace(/\.block/, ""),
          originalSource: text,
          originalSyntax: Syntax.css,
          parseResult: postcss.parse(text, { from: filepath }),
          dependencies: []
        });
        await diagnostics.sendDiagnostics([], uri);
      } catch (e) {
        if (e instanceof CssBlockError) {
          await diagnostics.sendDiagnostics([e], uri);
        }
      }
      break;
  }
});

// async function sendDiagnostics(
//   errors: CssBlockError[],
//   uri: string
// ): Promise<void> {
//   let diagnostics: Diagnostic[] = [];

//   errors.forEach(error => {
//     let range = error.location!;

//     if (!errorHasRange(range)) {
//       return;
//     }

//     const diagnostic: Diagnostic = {
//       severity: DiagnosticSeverity.Error,
//       range: {
//         start: {
//           line: range.start.line - 1,
//           character: range.start.column - 1
//         },
//         end: {
//           line: range.end.line - 1,
//           // TODO: explain why we are doing this better. their end character is
//           // the next character after the end of the range.
//           character: range.end.column
//         }
//       },
//       message: error.origMessage
//     };

//     diagnostics.push(diagnostic);
//   });

//   // Send the computed diagnostics to the connected client.
//   connection.sendDiagnostics({ uri, diagnostics });
// }

// This handler provides the initial list of the completion items.
connection.onCompletion(
  async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
    const document = documents.get(params.textDocument.uri);
    if (document) {
      // TODO: figure out why this is not working and use it instead of the
      // following replace hack
      // const filepath = url.fileURLToPath(uri);
      const filepath = document.uri.replace(/^file:\/\//, "");
      // const filepath = url.fileURLToPath(document.uri);
      const extension = filepath.split(".").pop();

      switch (extension) {
        case "hbs":
          const blockPath = filepath
            .replace(/.hbs$/, ".block.css")
            .replace(
              new RegExp(`${path.sep}templates${path.sep}`),
              `${path.sep}styles${path.sep}`
            );

          try {
            const block = await factory.getBlockFromPath(blockPath);
            const attributes = block.rootClass.getAttributes();
            let completions = attributes.map(
              (attr): CompletionItem => ({
                label: `${attr.namespace}:${attr.name}`,
                kind: CompletionItemKind.Property
              })
            );

            block.classes
            	// TODO: figure out if this is a reliable way to remove :scope
              .filter(blockClass => !blockClass.isRoot)
              .forEach(blockClass => {
                const classCompletion: CompletionItem = {
                  label: blockClass.name,
                  kind: CompletionItemKind.Property
                };

                const classAttributeCompletions = blockClass
                  .getAttributes()
                  .map(
                    (attr): CompletionItem => ({
                      label: `${attr.namespace}:${attr.name}`,
                      kind: CompletionItemKind.Property
                    })
                  );

                completions = completions.concat(
                  classCompletion,
                  classAttributeCompletions
                );
              });

            // TODO: we can make this smarter by inspecting the
            // glimmer/handlebars ast to see what completions make sense. Right
            // now we are just returning everything from the block file and its
            // imports.
            return completions;
          } catch (e) {
            return [];
          }
        default:
          return [];
      }
    }

    return [];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = "TypeScript details";
      item.documentation = "TypeScript documentation";
    } else if (item.data === 2) {
      item.detail = "JavaScript details";
      item.documentation = "JavaScript documentation";
    }
    return item;
  }
);

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
