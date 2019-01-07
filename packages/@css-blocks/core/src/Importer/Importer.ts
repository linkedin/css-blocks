import * as path from "path";

import { ObjectDictionary, whatever } from "@opticss/util";

import { Block } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";

export enum Syntax {
  sass = "sass",
  scss = "scss",
  css = "css",
  less = "less",
  stylus = "styl",
  other = "other",
}

export function syntaxName(syntax: Syntax): string {
  return Object.keys(Syntax).find(s => Syntax[s] === syntax) || "other";
}

/**
 * Importers have a special `importerData` property on the CSS Blocks configuration
 * options hash where custom importers can request for additional importer configuration
 * to be passed. All `Importer` methods are passed the configuration hash.
 */
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

  /**
   * The timestamp of when this file was read in.
   */
  timestamp: number;
}

/**
 * Importer provides an API that enables css-blocks to resolve a
 * @block directive into a string that is a css-block stylesheet and
 * to determine in which syntax the file is written.
 *
 * Importing does not have to ever talk to the filesystem, but importers that
 * do, will probably want to inherit from NodeJsImporter.
 *
 * All importers enforce automatic memoization of `Importer.identifier()` and
 * `Importer.import()` calls for improved performance and build consistency.
 * Consumers may selectively purge these caches (ex: for incremental or watched
 * builds) using the `Importer.purgeIdent()` and `Importer.purgeAll()` methods.
 */
export abstract class Importer {

  private _identCache: Map<string, FileIdentifier> = new Map();
  private _reverseIdentCache: Map<FileIdentifier, string> = new Map();
  private _fileCache: Map<FileIdentifier, ImportedFile> = new Map();

  /**
   * Compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it. This method automatically
   * memoizes the sub-classed `Importer` implementation's protected `getIdentifier` method for
   * improved performance. Importer caches may be purged using `purgeIdent()` or `purgeAll()`.
   */
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier {
    let key = fromIdentifier ? path.resolve(fromIdentifier, importPath) : importPath;
    let out = this._identCache.get(key);
    if (out) { return out; }
    out = this.getIdentifier(fromIdentifier, importPath, config);
    this._identCache.set(key, out);
    this._reverseIdentCache.set(out, key);
    return out;
  }

  /**
   * Import the file with the given metadata and return a string and meta data for it.
   * This method automatically memoizes the sub-classed `Importer` implementation's
   * protected `getIdentifier` method for improved performance. Importer caches may be
   * purged using `purgeIdent()` or `purgeAll()`.
   */
  async import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile> {
    let out = this._fileCache.get(identifier);
    if (out) { return out; }
    out = await this.getImport(identifier, config);
    this._fileCache.set(identifier, out);
    return out;
  }

  /**
   * Purge a single ident from the `Importer` caches.
   *
   * @param ident string  The file identifier to purge.
   * @returns True if ident successfully purged. False if ident was not present.
   */
  purgeIdent(ident: string): boolean {
    if (!this._reverseIdentCache.has(ident)) { return false; }
    let importPath = this._reverseIdentCache.get(ident)!;
    this._reverseIdentCache.delete(ident);
    this._identCache.delete(importPath);
    this._fileCache.delete(ident);
    return true;
  }

  /**
   * Purge all cached idents from the `Importer` caches.
   *
   * @returns True when idents successfully purged.
   */
  purgeAll(): boolean {
    this._reverseIdentCache = new Map();
    this._identCache = new Map();
    this._fileCache = new Map();
    return true;
  }

  /**
   * Check to see if the provided Block is the latest version
   * cached by the importer. If false, then we have an out dated
   * Block.
   *
   * @returns True when Block is current, else False.
   */
  isLatestBlock(block: Block) {
    const ident = block.identifier;
    const file = this._fileCache.get(ident);
    return file ? file.timestamp === block.timestamp : false;
  }

  /**
   * Import the file with the given metadata and return a string and meta data for it.
   */
  protected abstract getIdentifier(fromIdentifier: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier;

  /**
   * Import the file with the given metadata and return a string and meta data for it.
   */
  protected abstract async getImport(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile>;

  /**
   * the default name of the block used unless the block specifies one itself.
   */
  abstract defaultName(identifier: FileIdentifier, configuration: ResolvedConfiguration): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  abstract filesystemPath(identifier: FileIdentifier, config: ResolvedConfiguration): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  abstract debugIdentifier(identifier: FileIdentifier, config: ResolvedConfiguration): string;
  /**
   * returns the syntax the contents are written in.
   */
  abstract syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax;
}
