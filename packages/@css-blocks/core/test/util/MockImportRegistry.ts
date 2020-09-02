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
import { EMBEDDED_DEFINITION_TAG } from "../../src/importing/NodeJsImporter";

const PROJECT_DIR = path.resolve(__dirname, "../../..");
export interface SourceWithSyntax {
  contents: string;
  syntax: Syntax;
  dfnContents?: string;
  dfnIdentifier?: string;
  hasEmbeddedDfnData?: boolean;
}
export type SourceRegistry = ObjectDictionary<SourceWithSyntax>;
export type ImportedFiles = ObjectDictionary<boolean>;

/**
 * A fake importer that behaves similar to the NodeJsImporter, but doesn't actually
 * read any files from the file system.
 */
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
        rawCssContents: source.contents,
      };
    } else if (source.hasEmbeddedDfnData) {
      const parsedSourceContents = this.segmentizeCompiledBlockCSS(source.contents);
      const blockCssContents = parsedSourceContents.blockCssContents;
      const blockId = parsedSourceContents.blockId;
      const definitionIdentifier = `${resolvedPath}${EMBEDDED_DEFINITION_TAG}`;
      const definitionContents = Buffer.from(parsedSourceContents.definitionUrl.split(",")[1], "base64").toString("utf-8");
      return {
        type: "ImportedCompiledCssFile",
        syntax: Syntax.css,
        identifier: resolvedPath,
        cssContents: blockCssContents,
        definitionIdentifier,
        definitionContents,
        blockId: blockId,
        defaultName: this.defaultName(resolvedPath, configuration),
        rawCssContents: source.contents,
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

/**
 * A registry of sources that the MockImporter can pull files from. When writing
 * integration or acceptance tests, you can use this to avoid interacting with the
 * file system directly.
 */
export class MockImportRegistry {
  sources: SourceRegistry = {};
  imported: ImportedFiles = {};

  /**
   * Register a source "file" that can be read by the MockImporter.
   * @param sourcePath - The filepath the source can be looked up from.
   * @param contents - The contents of the source.
   * @param syntax - The syntax/format of the source data. Defaults to CSS.
   * @param hasEmbeddedDfnData - Whether the source data includes embedded base64 definition data. Defaults to false.
   */
  registerSource(sourcePath: string, contents: string, syntax?: Syntax, hasEmbeddedDfnData?: boolean) {
    sourcePath = this.relativize(sourcePath);
    this.sources[sourcePath] = {
      contents: contents,
      syntax: syntax || Syntax.css,
      hasEmbeddedDfnData: hasEmbeddedDfnData || false,
    };
  }

  /**
   * Registers a Compiled CSS source "file" and its associated definition "file" that can both
   * be read by the MockImporter.
   * @param sourcePath - The filepath the Compiled CSS can be looked up from.
   * @param cssContents - The contents of the Compiled CSS.
   * @param dfnIdentifier - The filepath the definition data can be looked up from.
   * @param dfnContents - The contents of the definition data.
   */
  registerCompiledCssSource(sourcePath: string, cssContents: string, dfnIdentifier: string, dfnContents: string) {
    sourcePath = this.relativize(sourcePath);
    this.sources[sourcePath] = {
      contents: cssContents,
      syntax: Syntax.css,
      dfnContents,
      dfnIdentifier,
    };
  }

  /**
   * Records that a particular source path has been imported.
   * @param sourcePath - The source path to record as imported.
   */
  markImported(sourcePath: string) {
    sourcePath = this.relativize(sourcePath);
    this.imported[sourcePath] = true;
  }

  /**
   * Assers that a particular source path has been imported by the MockImporter.
   * @param sourcePath - The source path to assert was imported.
   */
  assertImported(sourcePath: string) {
    sourcePath = this.relativize(sourcePath);
    if (!this.imported[sourcePath]) {
      let importedFiles = Object.keys(this.imported).join(", ");
      assert(
             false,
             `${sourcePath} was not imported as expected. These were imported: ${importedFiles}`);
    }
  }

  /**
   * Given an absolute path, generate the relative path, relative to the root of /core.
   * @param absolutePath - The absolute path to turn into a relative path.
   * @returns The relative path.
   */
  relativize(absolutePath: string): string {
    if (absolutePath.startsWith(PROJECT_DIR)) {
      return absolutePath.slice(PROJECT_DIR.length + 1);
    } else {
      return absolutePath;
    }
  }

  /**
   * Generates a new MockImporter associated with this MockImportRegistry instance.
   * You can hand this importer off to other classes such as BlockFactory to import
   * mock "files" from this registry.
   * @returns The generated Importer instance.
   */
  importer(): Importer {
    return new MockImporter(this);
  }

  /**
   * Resets the sources and imported paths in this registry, without fully destroying
   * the MockImporter or this instance.
   */
  reset() {
    this.sources = {};
    this.imported = {};
  }
}
