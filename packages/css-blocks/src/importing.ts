import { ObjectDictionary, whatever } from "@opticss/util";
import * as fs from "fs";
import * as path from "path";

import { Syntax } from "./BlockParser";
import { ResolvedConfiguration } from "./options";

declare module "./options" {
  export interface Configuration {
    importer: Importer;
    importerData: ImporterData;
  }
}

export type ImporterData = ObjectDictionary<whatever>;

/**
 * A FileIdentifier is a string with a whatever internal encoding is needed to uniquely resolve
 * a file or relative importPath against the identifier by an importer. FileIdentifiers may be
 * serialized across processes and should not encode any transient state. If an importer
 * wraps another importer, it is responsible for mangling and de-mangling the import identifier to
 * ensure that the namespaces of the importers do not collide.
 *
 * Care should be taken to ensure that the same block file is never returned
 * with different identifiers. The identifier a returned on an ImportedFile
 * should be different from the identifier that was requested if the requested
 * identifier was not canonical. The block factory will ensure that all blocks
 * returned to the consumer are unique to the canonical identifier.
 */
export type FileIdentifier = string;

/**
 * Structure that CSS Blocks uses to represent a single file.
 */
export interface ImportedFile {
  /**
   * A unique identifier (probably an absolute filesystem path) that describes
   * the block and can be used for caching.
   */
  identifier: FileIdentifier;
  /**
   * The default name for the block based on its identifier. This is used when a block doesn't specify a name for itself.
   */
  defaultName: string;
  /**
   * The syntax of the source contents. This could be determined by filename extension or some other metadata.
   */
  syntax: Syntax;
  /**
   * The contents of the imported file.
   */
  contents: string;
}

/**
 * Interface for supported CSS Blocks file importers. All custom importers must
 * implement this shape.
 */
export interface Importer {
  /**
   * compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it.
   */
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, options: ResolvedConfiguration): FileIdentifier;
  /**
   * import the file with the given metadata and return a string and meta data for it.
   */
  import(identifier: FileIdentifier, options: ResolvedConfiguration): Promise<ImportedFile>;
  /**
   * the default name of the block used unless the block specifies one itself.
   */
  defaultName(identifier: FileIdentifier, options: ResolvedConfiguration): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  filesystemPath(identifier: FileIdentifier, options: ResolvedConfiguration): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  debugIdentifier(identifier: FileIdentifier, options: ResolvedConfiguration): string;
  /**
   * returns the syntax the contents are written in.
   */
  syntax(identifier: FileIdentifier, options: ResolvedConfiguration): Syntax;
}

export abstract class PathBasedImporter implements Importer {
  identifier(fromFile: string | null, importPath: string, options: ResolvedConfiguration): string {
    let fromDir = fromFile ? path.dirname(fromFile) : options.rootDir;
    return path.resolve(fromDir, importPath);
  }
  defaultName(identifier: string, _options: ResolvedConfiguration): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
  filesystemPath(identifier: FileIdentifier, _options: ResolvedConfiguration): string | null {
    return identifier;
  }
  syntax(identifier: FileIdentifier, options: ResolvedConfiguration): Syntax {
    let filename = this.filesystemPath(identifier, options);
    if (filename) {
      let ext = path.extname(filename).substring(1);
      switch (ext) {
        case Syntax.css:
          return Syntax.css;
        case Syntax.scss:
          return Syntax.scss;
        case Syntax.sass:
          return Syntax.sass;
        case Syntax.less:
          return Syntax.less;
        case Syntax.stylus:
          return Syntax.stylus;
        default:
          return Syntax.other;
      }
    } else {
      return Syntax.other;
    }
  }
  debugIdentifier(identifier: FileIdentifier, options: ResolvedConfiguration): string {
    return path.relative(options.rootDir, identifier);
  }
  abstract import(identifier: FileIdentifier, options: ResolvedConfiguration): Promise<ImportedFile>;
}

export class FilesystemImporter extends PathBasedImporter {
  filesystemPath(identifier: FileIdentifier, _options: ResolvedConfiguration): string | null {
    if (path.isAbsolute(identifier) && existsSync(identifier)) {
      return identifier;
    } else {
      return null;
    }
  }
  import(identifier: FileIdentifier, options: ResolvedConfiguration): Promise<ImportedFile> {
    return new Promise((resolve, reject) => {
      fs.readFile(identifier, "utf-8", (err: whatever, data: string) => {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            syntax: this.syntax(identifier, options),
            identifier: identifier,
            defaultName: this.defaultName(identifier, options),
            contents: data,
          });
        }
      });
    });
  }
}

function existsSync(path: string) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

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
  identifier(from: FileIdentifier | null, importPath: string, options: ResolvedConfiguration) {
    if (path.isAbsolute(importPath)) {
      return importPath;
    }
    if (from) {
      let fromPath = this.filesystemPath(from, options);
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
      return path.resolve(options.rootDir, importPath);
    }
  }
  debugIdentifier(identifier: FileIdentifier, options: ResolvedConfiguration): string {
    let alias = this.aliases.find(a => identifier.startsWith(a.path));
    if (alias) {
      return path.join(alias.alias, path.relative(alias.path, identifier));
    }
    return path.relative(options.rootDir, identifier);
  }
}

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export let filesystemImporter = new FilesystemImporter();
