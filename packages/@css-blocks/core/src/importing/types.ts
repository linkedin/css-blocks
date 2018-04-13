import { ObjectDictionary, whatever } from "@opticss/util";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

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
}

/**
 * Importer provides an API that enables css-blocks to resolve a
 * @block-reference directive into a string that is a css-block stylesheet and
 * to determine in which syntax the file is written.
 *
 * Importing does not have to ever talk to the filesystem, but importers that
 * do, will probably want to inherit from either PathBasedImporter or
 * FilesystemImporter.
 */
export interface Importer {
  /**
   * compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it.
   */
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, configuration: ResolvedConfiguration): FileIdentifier;
  /**
   * import the file with the given metadata and return a string and meta data for it.
   */
  import(identifier: FileIdentifier, configuration: ResolvedConfiguration): Promise<ImportedFile>;
  /**
   * the default name of the block used unless the block specifies one itself.
   */
  defaultName(identifier: FileIdentifier, configuration: ResolvedConfiguration): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  filesystemPath(identifier: FileIdentifier, configuration: ResolvedConfiguration): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  debugIdentifier(identifier: FileIdentifier, configuration: ResolvedConfiguration): string;
  /**
   * returns the syntax the contents are written in.
   */
  syntax(identifier: FileIdentifier, configuration: ResolvedConfiguration): Syntax;
}
