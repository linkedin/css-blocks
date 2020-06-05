import { ObjectDictionary } from "@opticss/util";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

/**
 * Importers have a special `importerData` property on the CSS Blocks configuration
 * options hash where custom importers can request for additional importer configuration
 * to be passed. All `Importer` methods are passed the configuration hash.
 */
export type ImporterData = ObjectDictionary<unknown>;

/**
 * A FileIdentifier is a string with a unknown internal encoding is needed to uniquely resolve
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
 * Structure that CSS Blocks uses to represent an imported file.
 */
export interface ImportedFile {
  /**
   * The interface this object implements. If this is omitted, process as if
   * the file is an ImportedFile.
   */
  type?: "ImportedFile";
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
 * Represents the parsed contents from an imported pre-compiled CSS file.
 */
export interface ImportedCompiledCssFileContents {
  /**
   * File contents prior to the CSS Blocks header comment.
   */
  pre: string;

  /**
   * The Block ID as declared in the header comment. This is expected
   * to match the `block-id` declaration for the `:scope` selector
   * in the definition.
   */
  blockId: string;

  /**
   * The CSS rules that are present in this file. Only captures any CSS
   * output between the header and footer comment. The comment that
   * contains the definition url is omitted.
   */
  blockCssContents: string;

  /**
   * The definition URL as declared in the definition comment. This can
   * be a relative path or embedded Base64 data.
   */
  definitionUrl: string;

  /**
   * File contents after the CSS Blocks footer comment.
   */
  post: string;
}

/**
 * Represents an aggregate pre-compiled CSS file and the associated block
 * definitions for that file. The definitions may be a separate file
 * altogether or inlined with the compiled contents.
 */
export interface ImportedCompiledCssFile {
  type: "ImportedCompiledCssFile";

  /**
   * A unique identifier (probably an absolute filesystem path) that describes
   * the block and can be used for caching.
   */
  identifier: FileIdentifier;

  /**
   * The syntax of the source contents. For pre-compiled files, this is always CSS.
   */
  syntax: Syntax.css;

  /**
   * The CSS rules imported from the pre-compiled CSS file.
   */
  cssContents: string;

  /**
   * The Block ID as declared in the header comment. This is expected
   * to match the `block-id` declaration for the `:scope` selector
   * in the definition.
   */
  blockId: string;

  /**
   * A unique identifier (probably an absolute filesystem path) for the block's definition
   * data. Even if the data is embedded in the same file as the Compiled CSS, this should
   * be distinct from the Compiled CSS identifier.
   */
  definitionIdentifier: string;

  /**
   * The contents of the block definition. If this was embedded base64 data, it will
   * have been decoded into a string. If this was an external file, the file's
   * contents will be included here.
   */
  definitionContents: string;

  /**
   * The default name for the block based on its identifier. This is used
   * when a block doesn't specify a name for itself.
   * A successful build should never fall back to this... having to use this
   * value instead of being able to find it in the definition data is
   * an error.
   */
  defaultName: string;
}

/**
 * Importer provides an API that enables css-blocks to resolve a
 * @block directive into a string that is a css-block stylesheet and
 * to determine in which syntax the file is written.
 *
 * Importing does not have to ever talk to the filesystem, but importers that
 * do, will probably want to inherit from NodeJsImporter.
 */
export interface Importer {
  /**
   * compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it.
   */
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier;
  /**
   * import the file with the given metadata and return a string and meta data for it.
   */
  import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile | ImportedCompiledCssFile>;
  /**
   * the default name of the block used unless the block specifies one itself.
   */
  defaultName(identifier: FileIdentifier, configuration: ResolvedConfiguration): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  filesystemPath(identifier: FileIdentifier, config: ResolvedConfiguration): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  debugIdentifier(identifier: FileIdentifier, config: ResolvedConfiguration): string;
  /**
   * returns the syntax the contents are written in.
   */
  syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax;
}
