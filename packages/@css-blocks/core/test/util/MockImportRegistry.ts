import { ObjectDictionary } from "@opticss/util";
import { assert } from "chai";
import * as path from "path";

import {
  ImportedCompiledCssFile,
  ImportedFile,
  Importer,
  NodeJsImporter,
  ResolvedConfiguration,
  Syntax,
} from "../../src";

const PROJECT_DIR = path.resolve(__dirname, "../../..");
export interface SourceWithSyntax {
  contents: string;
  syntax: Syntax;
  dfnContents?: string;
  dfnIdentifier?: string;
}
export type SourceRegistry = ObjectDictionary<SourceWithSyntax>;
export type ImportedFiles = ObjectDictionary<boolean>;

export class MockImporter extends NodeJsImporter {
  registry: MockImportRegistry;
  constructor(registry: MockImportRegistry) {
    super();
    this.registry = registry;
  }
  identifier(fromFile: string | null, importPath: string, _options: ResolvedConfiguration) {
    if (fromFile) {
      let sourceDir: string = path.dirname(fromFile);
      return this.registry.relativize(path.resolve(sourceDir, importPath));
    } else {
      return importPath;
    }
  }
  async import(resolvedPath: string, configuration: ResolvedConfiguration): Promise<ImportedFile | ImportedCompiledCssFile> {
    let source = this.registry.sources[resolvedPath];
    if (!source) {
      let importedFiles = Object.keys(this.registry.sources).join(", ");
      throw new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`);
    }
    this.registry.imported[resolvedPath] = true;
    if (source.dfnContents && source.dfnIdentifier) {
      const parsedSourceContents = this.segmentizeCompiledBlockCSS(source.contents);
      const blockCssContents = parsedSourceContents.blockCssContents;
      const blockId = parsedSourceContents.blockId;
      return {
        type: "ImportedCompiledCssFile",
        syntax: Syntax.css,
        identifier: resolvedPath,
        cssContents: blockCssContents,
        definitionIdentifier: source.dfnIdentifier,
        definitionContents: source.dfnContents,
        blockId: blockId,
        defaultName: this.defaultName(resolvedPath, configuration),
      };
    } else {
      return {
        type: "ImportedFile",
        syntax: source.syntax,
        identifier: resolvedPath,
        defaultName: this.defaultName(resolvedPath, configuration),
        contents: source.contents,
      };
    }
  }
}

export class MockImportRegistry {
  sources: SourceRegistry = {};
  imported: ImportedFiles = {};

  registerSource(sourcePath: string, contents: string, syntax?: Syntax) {
    sourcePath = this.relativize(sourcePath);
    this.sources[sourcePath] = {
      contents: contents,
      syntax: syntax || Syntax.css,
    };
  }

  registerCompiledCssSource(sourcePath: string, cssContents: string, dfnIdentifier: string, dfnContents: string) {
    sourcePath = this.relativize(sourcePath);
    this.sources[sourcePath] = {
      contents: cssContents,
      syntax: Syntax.css,
      dfnContents,
      dfnIdentifier,
    };
  }

  markImported(sourcePath: string) {
    sourcePath = this.relativize(sourcePath);
    this.imported[sourcePath] = true;
  }

  assertImported(sourcePath: string) {
    sourcePath = this.relativize(sourcePath);
    if (!this.imported[sourcePath]) {
      let importedFiles = Object.keys(this.imported).join(", ");
      assert(
             false,
             `${sourcePath} was not imported as expected. These were imported: ${importedFiles}`);
    }
  }

  relativize(absolutePath: string) {
    if (absolutePath.startsWith(PROJECT_DIR)) {
      return absolutePath.slice(PROJECT_DIR.length + 1);
    } else {
      return absolutePath;
    }
  }

  importer(): Importer {
    return new MockImporter(this);
  }
}
