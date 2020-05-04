import { ObjectDictionary } from "@opticss/util";
import * as debugGenerator from "debug";
import { existsSync, readFile, readFileSync } from "fs-extra";
import * as path from "path";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

import { BaseImporter } from "./BaseImporter";
import { FileIdentifier, ImportedFile } from "./Importer";

const debug = debugGenerator("css-blocks:importer");

const DEFAULT_MAIN = "blocks/index.block.css";

export interface CSSBlocksPackageMetadata {
  "css-blocks"?: {
    main?: string;
  };
}

/**
 * An Alias maps the starting segment of a relative import path to a
 * corresponding absolute path to attempt to resolve against.
 */
export interface Alias {
  alias: string;
  path: string;
}

export class NodeJsImporter extends BaseImporter {
  aliases: Alias[];
  constructor(aliases: Alias[] | ObjectDictionary<string> = []) {
    super();

    // Normalize aliases input.
    this.aliases = Array.isArray(aliases)
      ? aliases.slice()
      : Object.keys(aliases).map(alias => ({ alias, path: aliases[alias] }));

    // Sort aliases most specific to least specific.
    this.aliases.sort((a, b) => b.path.length - a.path.length);

    // Validate aliases paths.
    for (let alias of this.aliases) {
      if (!path.isAbsolute(alias.path)) {
        throw new Error(`Alias paths must be absolute. Got ${alias.alias} => ${alias.path}`);
      }
    }
  }

  identifier(from: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier {
    // If absolute, this is the identifier.
    if (path.isAbsolute(importPath)) { return importPath; }

    // Attempt to resolve relative path to absolute path relative to the
    // `from` or `rootDir`. If it exists, return.
    from = from ? this.filesystemPath(from, config) : from;
    let fromDir = from ? path.dirname(from) : config.rootDir;
    // TODO: this won't work on windows because the import path is using `/`
    let resolvedPath = path.resolve(fromDir, importPath);
    if (existsSync(resolvedPath)) { return resolvedPath; }
    debug(`No relative or absolute Block file discovered for ${importPath}.`);

    // If not a real file, attempt to resolve to an aliased path instead, if present.
    let alias = this.aliases.find(a => importPath.startsWith(a.alias));
    if (alias) {
      importPath = path.join(alias.path, importPath.replace(alias.alias, ""));
    }
    else {
      debug(`No file path alias discovered for ${importPath}.`);
    }

    // If no alias found, test for a node_module resolution as a file path.
    try {
      const file = require.resolve(importPath, { paths: [config.rootDir] });
      const extname = path.extname(file).slice(1);
      const fileExts = { css: true, ...config.preprocessors };
      if (!fileExts[extname]) { throw Error("Invalid Block File Extension"); }
      debug(`Discovered Node.js resolvable file: ${file}`);
      return file;
    } catch (err) {
      debug(`Could not resolve ${importPath} as a local file. Resolution failed with ${err.message}.`);
    }

    // If no file found, test for a node_module resolution as a package name.
    try {
      // require doesn't take filesystem paths; it expects a unix-like path.
      // https://github.com/nodejs/node/issues/6049#issuecomment-205778576
      const modulePath = path.sep === "/" ? importPath : importPath.split(path.sep).join("/");
      const packageJSONPath = require.resolve(`${modulePath}/package.json`, { paths: [config.rootDir] });
      const packageJSON: CSSBlocksPackageMetadata = JSON.parse(readFileSync(packageJSONPath, "utf-8"));
      const blockMetadata = packageJSON["css-blocks"];
      const main = blockMetadata && blockMetadata.main || DEFAULT_MAIN;
      return path.resolve(packageJSONPath, "..", main);
    } catch (err) {
      debug(`Could not resolve ${importPath} from a node module. Resolution failed with ${err.message}.`);
    }

    // If no backup alias or node_module found, return the previously calculated
    // absolute path where we expect it should be.
    return resolvedPath;
  }

  defaultName(identifier: string, _config: ResolvedConfiguration): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) { name = name.substr(0, name.length - 6); }
    return name;
  }

  filesystemPath(identifier: FileIdentifier, _options: ResolvedConfiguration): string | null {
    return path.isAbsolute(identifier) && existsSync(identifier) ? identifier : null;
  }

  syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax {
    let filename = this.filesystemPath(identifier, config);
    if (!filename) { return Syntax.other; }
    let ext = path.extname(filename).substring(1);
    switch (ext) {
      case Syntax.css:    return Syntax.css;
      case Syntax.scss:   return Syntax.scss;
      case Syntax.sass:   return Syntax.sass;
      case Syntax.less:   return Syntax.less;
      case Syntax.stylus: return Syntax.stylus;
      default:            return Syntax.other;
    }
  }

  debugIdentifier(identifier: FileIdentifier, config: ResolvedConfiguration): string {
    let alias = this.aliases.find(a => identifier.startsWith(a.path));
    if (alias) {
      return path.join(alias.alias, path.relative(alias.path, identifier));
    }
    return path.relative(config.rootDir, identifier);
  }

  async import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile> {
    let contents = await readFile(identifier, "utf-8");
    // TODO: Add support for CompiledCSS files.
    return {
      type: "ImportedBlockFile",
      syntax: this.syntax(identifier, config),
      identifier,
      defaultName: this.defaultName(identifier, config),
      contents,
    };
  }
}
