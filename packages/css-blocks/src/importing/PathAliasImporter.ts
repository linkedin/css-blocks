import { ObjectDictionary } from "@opticss/util";
import * as path from "path";

import { ResolvedConfiguration } from "../configuration";

import { FilesystemImporter } from "./FilesystemImporter";
import { existsSync } from "./existsSync";
import { FileIdentifier } from "./types";

export interface Alias {
  /**
   * A path segment that identifies this path location. Relative import paths can start with this
   * path segment and will be resolved to the corresponding absolute path.
   */
  alias: string;
  /**
   * An absolute path that the alias refers to.
   */
  path: string;
}

export type PathAliases = Alias[] | ObjectDictionary<string>;

/**
 * The PathAliasImporter is a replacement for the fileystem importer. Relative import paths
 * are first checked to see if they match an existing file relative to the from identifier (when provided).
 * Then if the relative import path has a first segment that is any of the aliases provided the path
 * will be made absolute using that alias's path location. Finally any relative path is resolved against
 * the rootDir specified from {CssBlockOptionsReadonly}.
 *
 * When debugging an identifier it is made relative to an alias, if one exists, where the identifier is
 * within an aliased directory. If several such aliased paths exist, the most specific alias will be used.
 */

export class PathAliasImporter extends FilesystemImporter {
  aliases: Alias[];
  constructor(aliases: PathAliases) {
    super();
    if (Array.isArray(aliases)) {
      this.aliases = aliases;
    } else {
      this.aliases = [];
      Object.keys(aliases).forEach(alias => {
        this.aliases.push({ alias: alias, path: aliases[alias] });
      });
    }
    this.aliases.forEach(alias => {
      if (!path.isAbsolute(alias.path)) {
        throw new Error(`Alias paths must be absolute. Got ${alias.alias} => ${alias.path}`);
      }
    });
    this.aliases.sort((a, b) => {
      return b.path.length - a.path.length;
    });
  }
  identifier(from: FileIdentifier | null, importPath: string, configuration: ResolvedConfiguration) {
    if (path.isAbsolute(importPath)) {
      return importPath;
    }
    if (from) {
      let fromPath = this.filesystemPath(from, configuration);
      if (fromPath) {
        let resolvedPath = path.resolve(path.dirname(fromPath), importPath);
        if (existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
    }
    let alias = this.aliases.find(a => importPath.startsWith(a.alias + path.sep));
    if (alias) {
      return path.resolve(alias.path, importPath.substring(alias.alias.length + 1));
    } else {
      return path.resolve(configuration.rootDir, importPath);
    }
  }
  debugIdentifier(identifier: FileIdentifier, configuration: ResolvedConfiguration): string {
    let alias = this.aliases.find(a => identifier.startsWith(a.path));
    if (alias) {
      return path.join(alias.alias, path.relative(alias.path, identifier));
    }
    return path.relative(configuration.rootDir, identifier);
  }
}
