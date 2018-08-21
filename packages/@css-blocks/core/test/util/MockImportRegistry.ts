import { ObjectDictionary } from "@opticss/util";
import { assert } from "chai";
import * as path from "path";

import {
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
  async import(resolvedPath: string, configuration: ResolvedConfiguration): Promise<ImportedFile> {
    let source = this.registry.sources[resolvedPath];
    if (!source) {
      let importedFiles = Object.keys(this.registry.sources).join(", ");
      throw new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`);
    }
    this.registry.imported[resolvedPath] = true;
    return {
      syntax: source.syntax,
      identifier: resolvedPath,
      defaultName: this.defaultName(resolvedPath, configuration),
      contents: source.contents,
    };
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
