import { BaseImporter, Configuration, ImportedCompiledCssFile, ImportedFile, Importer, Syntax, syntaxFromExtension } from "@css-blocks/core";
import * as debugGenerator from "debug";
import type { FS as MergedFileSystem } from "fs-merger";
import * as path from "path";

const debug = debugGenerator("css-blocks:broccoli-tree-importer");

export const IDENTIFIER_PREFIX = "broccoli-tree:";
const IDENTIFIER_PREFIX_LENGTH = IDENTIFIER_PREFIX.length;
const IDENTIFIER_PREFIX_RE = new RegExp(`^${IDENTIFIER_PREFIX}`);
export const EMBEDDED_DEFINITION_TAG = "#blockDefinitionURL";

export function isBroccoliTreeIdentifier(identifier: string | null): boolean {
  return !!(identifier && IDENTIFIER_PREFIX_RE.test(identifier));
}

export function identToPath(input: MergedFileSystem, identifier: string): string {
  if (!isBroccoliTreeIdentifier(identifier)) {
    return identifier;
  }
  let relativePath = identifier.substring(IDENTIFIER_PREFIX_LENGTH);
  if (!input.existsSync(relativePath)) {
    debug(`Couldn't find ${relativePath}. Looking in addon-tree-output.`);
    let addonRelativePath = `addon-tree-output/${relativePath}`;
    if (input.existsSync(addonRelativePath)) {
      relativePath = addonRelativePath;
    } else {
      let addonModulesRelativePath = `addon-tree-output/modules/${relativePath}`;
      if (input.existsSync(addonModulesRelativePath)) {
        relativePath = addonModulesRelativePath;
      }
    }
  }
  return relativePath;
}

export function pathToIdent(relativePath: string): string {
  if (isBroccoliTreeIdentifier(relativePath)) {
    return relativePath;
  }
  if (relativePath.startsWith("addon-tree-output/modules/")) {
    relativePath = relativePath.substring(26);
  } else if (relativePath.startsWith("addon-tree-output/")) {
    relativePath = relativePath.substring(18);
  }
  return IDENTIFIER_PREFIX + relativePath;
}

/**
 * Knows how to import blocks from a broccoli merged filesystem interface.
 */
export class BroccoliTreeImporter extends BaseImporter {
  fallbackImporter: Importer;
  input: MergedFileSystem;
  namespace: string | null;

  constructor(input: MergedFileSystem, namespace: string | null, fallbackImporter: Importer) {
    super();
    this.input = input;
    this.fallbackImporter = fallbackImporter;
    this.namespace = namespace;
  }

  identifier(fromIdentifier: string | null, importPath: string, config: Readonly<Configuration>): string {
    if (isBroccoliTreeIdentifier(fromIdentifier)) {
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        let parsedPath = path.parse(identToPath(this.input, fromIdentifier!));
        // We have to make resolve think the path is absolute or else it will
        // prepend the current working directory.
        let dir = "/" + parsedPath.dir;
        // then we take the `/` off again to make it relative to the broccoli tree.
        let relativePath = path.resolve(dir, importPath).substring(1);
        return pathToIdent(relativePath);
      } else {
        return this.fallbackImporter.identifier(null, importPath, config);
      }
    } else {
      return this.fallbackImporter.identifier(fromIdentifier, importPath, config);
    }
  }

  async import(identifier: string, config: Readonly<Configuration>): Promise<ImportedFile | ImportedCompiledCssFile> {
    if (isBroccoliTreeIdentifier(identifier)) {
      let relativePath = identToPath(this.input, identifier);
      let contents = this.input.readFileSync(relativePath, "utf8");
      let syntax = syntaxFromExtension(path.extname(relativePath));
      if (this.isCompiledBlockCSS(contents)) {
        const segmentedContents = this.segmentizeCompiledBlockCSS(contents);
        // Need to determine if the definition URL is an external URL we should
        // follow, or embedded data.
        const dfnUrl = segmentedContents.definitionUrl;
        let dfnData: string | null = null;
        let definitionIdentifier: string | null = null;
        if (dfnUrl.startsWith("data:")) {
          // Parse this as embedded data.
          const [dfnHeader, dfnEncodedData] = dfnUrl.split(",");
          definitionIdentifier = `${identifier}${EMBEDDED_DEFINITION_TAG}`;
          if (dfnHeader === "data:text/css;base64") {
            dfnData = Buffer.from(dfnEncodedData, "base64").toString("utf-8");
          } else {
            throw new Error(`Definition data is in unsupported encoding or format. Embedded data must be in text/css;base64 format.\nFile Identifier: ${identifier}\nFormat given: ${dfnHeader}`);
          }
        } else {
          throw new Error(`Only embedded definition URLs are supported in ember at this time.`);
        }

        // Clean up definition data and location.
        dfnData = dfnData.trim();
        definitionIdentifier = definitionIdentifier.trim();
        debug("Importing definition file %s:\n%s", definitionIdentifier, dfnData);

        return {
          type: "ImportedCompiledCssFile",
          syntax: Syntax.css,
          identifier,
          cssContents: segmentedContents.blockCssContents,
          blockId: segmentedContents.blockId,
          definitionContents: dfnData,
          definitionIdentifier,
          defaultName: this.defaultName(identifier, config),
        };
      } else {
        return {
          type: "ImportedFile",
          identifier,
          defaultName: this.defaultName(identifier, config),
          syntax,
          contents,
        };
      }
    } else {
      return this.fallbackImporter.import(identifier, config);
    }
  }

  defaultName(identifier: string, configuration: Readonly<Configuration>): string {
    if (isBroccoliTreeIdentifier(identifier)) {
      let relativePath = identToPath(this.input, identifier);
      let defaultName = path.parse(relativePath).name;
      defaultName = defaultName.replace(/.block$/, "");
      if (this.namespace) {
        defaultName = `${defaultName}-${this.namespace}`;
      }
      return defaultName;
    } else {
      return this.fallbackImporter.defaultName(identifier, configuration);
    }
  }

  filesystemPath(identifier: string, config: Readonly<Configuration>): string | null {
    if (isBroccoliTreeIdentifier(identifier)) {
      let relativePath = identToPath(this.input, identifier);
      return relativePath;
    } else {
      return this.fallbackImporter.filesystemPath(identifier, config);
    }
  }

  debugIdentifier(identifier: string, config: Readonly<Configuration>): string {
    if (isBroccoliTreeIdentifier(identifier)) {
      let relativePath = identToPath(this.input, identifier);
      return relativePath;
    } else {
      return this.fallbackImporter.debugIdentifier(identifier, config);
    }
  }

  syntax(identifier: string, config: Readonly<Configuration>): Syntax {
    if (isBroccoliTreeIdentifier(identifier)) {
      let relativePath = identToPath(this.input, identifier);
      let syntax = syntaxFromExtension(path.extname(relativePath));
      return syntax;
    } else {
      return this.fallbackImporter.syntax(identifier, config);
    }
  }
}
