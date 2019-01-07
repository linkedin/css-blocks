import { ObjectDictionary } from "@opticss/util";
import { assert } from "chai";
import * as path from "path";

import { ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { ImportedFile, NodeJsImporter, Syntax } from "../Importer";

export interface SourceWithSyntax {
  contents: string;
  syntax: Syntax;
}
export type SourceRegistry = ObjectDictionary<SourceWithSyntax>;
export type ImportedFiles = ObjectDictionary<boolean>;

// TODO: This should be delivered by @css-blocks/test-utils, but Typescript
//       doesn't like cyclic type delivery. There must be a way to do this.
export class MockImporter extends NodeJsImporter {
  root: string;
  sources: SourceRegistry = {};
  imported: ImportedFiles = {};

  constructor(root?: string) {
    super();
    this.root = root || process.cwd();
  }

  getIdentifier(fromFile: string | null, importPath: string, _options: ResolvedConfiguration) {
    if (fromFile) {
      let sourceDir: string = path.dirname(fromFile);
      return this.relativize(path.resolve(sourceDir, importPath));
    } else {
      return importPath;
    }
  }

  async getImport(resolvedPath: string, configuration: ResolvedConfiguration): Promise<ImportedFile> {
    resolvedPath = this.identifier(null, resolvedPath, resolveConfiguration({}));
    let source = this.sources[resolvedPath];
    if (!source) {
      let importedFiles = Object.keys(this.sources).join(", ");
      throw new Error(`Mock file ${resolvedPath} not found. Available: ${importedFiles}`);
    }
    this.imported[resolvedPath] = true;
    return {
      syntax: source.syntax,
      identifier: resolvedPath,
      defaultName: this.defaultName(resolvedPath, configuration),
      contents: source.contents,
      timestamp: Date.now(),
    };
  }

  registerSource(sourcePath: string, contents: string, syntax?: Syntax) {
    sourcePath = this.identifier(null, sourcePath, resolveConfiguration({}));
    this.sources[sourcePath] = {
      contents: contents,
      syntax: syntax || Syntax.css,
    };
  }

  assertImported(sourcePath: string) {
    sourcePath = this.relativize(sourcePath);
    if (!this.imported[sourcePath]) {
      let importedFiles = Object.keys(this.imported).join(", ");
      assert(false, `${sourcePath} was not imported as expected. These were imported: ${importedFiles}`);
    }
  }

  private relativize(absolutePath: string) {
    if (absolutePath.startsWith(this.root)) {
      return absolutePath.slice(this.root.length + 1);
    } else {
      return absolutePath;
    }
  }
}
