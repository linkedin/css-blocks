import { ImportedFile, Importer, NodeJsImporter, ResolvedConfiguration as CSSBlocksConfiguration, Syntax } from "@css-blocks/core";
import { ObjectDictionary } from "@opticss/util";
import { assert } from "chai";
import * as path from "path";

const PROJECT_DIR = path.resolve(__dirname, "../../..");

export type SourceRegistry = ObjectDictionary<string>;
export type ImportedFiles = ObjectDictionary<boolean>;

export class MockImporter extends NodeJsImporter {
  registry: MockImportRegistry;
  constructor(registry: MockImportRegistry) {
    super();
    this.registry = registry;
  }
  identifier(fromFile: string | null, importPath: string, _options: CSSBlocksConfiguration) {
    if (fromFile) {
      let sourceDir: string = path.dirname(fromFile);
      return this.registry.relativize(path.resolve(sourceDir, importPath));
    } else {
      return importPath;
    }
  }
  async import(resolvedPath: string, options: CSSBlocksConfiguration): Promise<ImportedFile> {
    let contents = this.registry.sources[resolvedPath];
    if (!contents) {
      let importedFiles = Object.keys(this.registry.sources).join(", ");
      throw new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`);
    }
    this.registry.imported[resolvedPath] = true;
    return {
      syntax: Syntax.css,
      identifier: resolvedPath,
      defaultName: this.defaultName(resolvedPath, options),
      contents: contents,
    };
  }
}

export class MockImportRegistry {
  sources: SourceRegistry = {};
  imported: ImportedFiles = {};

  registerSource(sourcePath: string, contents: string) {
    sourcePath = this.relativize(sourcePath);
    this.sources[sourcePath] = contents;
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
