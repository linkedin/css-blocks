import { ObjectDictionary } from "@opticss/util";

import { existsSync, readFile } from "fs-extra";
import * as path from "path";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

import { FileIdentifier, ImportedFile, Importer } from "./Importer";

/**
 * An Alias maps the starting segment of a relative import path to a
 * corresponding absolute path to attempt to resolve against.
 */
export interface Alias {
  alias: string;
  path: string;
}

export class NodeJsImporter implements Importer {
  aliases: Alias[];
  constructor(aliases: Alias[] | ObjectDictionary<string> = []) {
    // Normalize aliases input.
    this.aliases = Array.isArray(aliases)
      ? aliases.slice()
      : Object.keys(aliases).map(alias => ({ alias: alias, path: aliases[alias] }));

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

    // Attempt to resolve to absolute path relative to `from` or `rootDir`.
    // If it exists, return.
    from = from ? this.filesystemPath(from, config) : from;
    let fromDir = from ? path.dirname(from) : config.rootDir;
    let resolvedPath = path.resolve(fromDir, importPath);
    if (existsSync(resolvedPath)) { return resolvedPath; }

    // If not a real file, attempt to resolve to an aliased path instead.
    let alias = this.aliases.find(a => importPath.startsWith(a.alias + path.sep));
    if (alias) {
      return path.resolve(alias.path, importPath.substring(alias.alias.length + 1));
    }

    // If no alias found, test for a node_module resolution.
    try {
      return require.resolve(importPath, { paths: [config.rootDir] });
    } catch (err) {}

    // If no backup alias or node_module fount, return the previously calculated
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
    return {
      syntax: this.syntax(identifier, config),
      identifier,
      defaultName: this.defaultName(identifier, config),
      contents,
    };
  }
}
