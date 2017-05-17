import * as path from "path";
import { assert } from "chai";

import { ImportedFile, Importer } from "../../src/importing";

const PROJECT_DIR = path.resolve(__dirname, "../../..");

export interface SourceRegistry {
  [sourcePath: string]: string;
}

export interface ImportedFiles {
  [sourcePath: string]: boolean;
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
    let registry = this;
    let importer: Importer = <Importer>function(fromFile: string, importPath: string): Promise<ImportedFile> {
      let sourceDir: string = path.dirname(fromFile);
      let resolvedPath = registry.relativize(path.resolve(sourceDir, importPath));
      return new Promise<ImportedFile>((resolve, reject) => {
        let contents = registry.sources[resolvedPath];
        if (contents) {
          registry.imported[resolvedPath] = true;
          resolve({
            path: resolvedPath,
            defaultName: importer.getDefaultName(resolvedPath),
            contents: contents
          });
        } else {
          let importedFiles = Object.keys(registry.sources).join(", ");
          reject(new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`));
        }
      });
    };
    importer.getDefaultName = this.getDefaultName;
    return importer;
  }

  getDefaultName(sourcePath: string): string {
    return path.parse(sourcePath).name;
  }
}
