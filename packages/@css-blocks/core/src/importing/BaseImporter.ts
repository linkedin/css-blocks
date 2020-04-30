import { Syntax } from '../BlockParser';
import { ResolvedConfiguration } from '../configuration';
import { Importer, FileIdentifier, ImportedFile } from './Importer';

/**
 * The BaseImporter is an abstract class that Importer implementations may extend from.
 * This follows the Importer interface that must be used for interacting with the BlockFactory.
 * We also include additional utility methods that are useful for handling CSS Blocks,
 * Compiled CSS, and Definition Files.
 */
export abstract class BaseImporter implements Importer {
  /**
   * Compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it.
   */
  abstract identifier(fromIdentifier: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier;
  /**
   * Import the file with the given metadata and return a string and meta data for it.
   */
  abstract import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile>;
  /**
   * The default name of the block used unless the block specifies one itself.
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
   * Returns the syntax the contents are written in.
   */
  abstract syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax;
}