import * as path from "path";
import { assert } from "chai";

import { ImportedFile, Importer, PluginOptionsReader, PathBasedImporter, Syntax } from "css-blocks";

const PROJECT_DIR = path.resolve(__dirname, "../../..");

export interface SourceRegistry {
  [sourcePath: string]: string;
}

export interface ImportedFiles {
  [sourcePath: string]: boolean;
}

export class MockImporter extends PathBasedImporter {
  registry: MockImportRegistry;
  constructor(registry: MockImportRegistry) {
    super();
    this.registry = registry;
  }
  identifier(fromFile: string | null, importPath: string, _options: PluginOptionsReader) {
    if (fromFile) {
      let sourceDir: string = path.dirname(fromFile);
      return this.registry.relativize(path.resolve(sourceDir, importPath));
    } else {
      return importPath;
    }
  }
  import(resolvedPath: string, options: PluginOptionsReader): Promise<ImportedFile> {
    return new Promise<ImportedFile>((resolve, reject) => {
      let contents = this.registry.sources[resolvedPath];
      if (contents) {
        this.registry.imported[resolvedPath] = true;
        resolve({
          syntax: Syntax.css,
          identifier: resolvedPath,
          defaultName: this.defaultName(resolvedPath, options),
          contents: contents
        });
      } else {
        let importedFiles = Object.keys(this.registry.sources).join(", ");
        reject(new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`));
      }
    });
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
      assert(false,
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
