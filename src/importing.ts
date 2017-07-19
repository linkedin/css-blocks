import * as path from "path";
import * as fs from "fs";
import {
  RawSourceMap
} from "source-map";
import {
  OptionsReader
} from "./options";

/**
 * A FileIdentifier is a string with a whatever internal encoding is needed to uniquely resolve
 * a file or relative importPath against the identifier by an importer. FileIdentifiers may be
 * serialized across processes and should not encode any transient state. If an importer
 * wraps another importer, it is responsible for mangling and demangling the import identifier to
 * ensure that the namespaces of the importers do not collide.
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
   * The contents of the imported file.
   */
  contents: string;
  /**
   * If the file was processed during import, a sourcemap should be provided.
   */
  sourceMap?: RawSourceMap | string;
  /**
   * If the file depends on other files that may change those dependencies should
   * be returned so that builds and caches can be correctly invalidated.
   */
  dependencies?: string[];
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
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, options: OptionsReader): FileIdentifier;
  /**
   * import the file with the given metadata and return a string and meta data for it.
   */
  import(identifier: FileIdentifier, options: OptionsReader): Promise<ImportedFile>;
  /**
   * the default name of the block used unless the block specifies one itself.
   */
  defaultName(identifier: FileIdentifier, options: OptionsReader): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  filesystemPath(identifier: FileIdentifier, options: OptionsReader): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  inspect(identifier: FileIdentifier, options: OptionsReader): string;
}

export abstract class PathBasedImporter implements Importer {
  identifier(fromFile: string | null, importPath: string, options: OptionsReader): string {
    let fromDir = fromFile ? path.dirname(fromFile) : options.rootDir;
    return path.resolve(fromDir, importPath);
  }
  defaultName(identifier: string, _options: OptionsReader): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
  filesystemPath(identifier: FileIdentifier, _options: OptionsReader): string | null {
    return identifier;
  }
  inspect(identifier: FileIdentifier, options: OptionsReader): string {
    return path.relative(options.rootDir, identifier);
  }
  abstract import(meta: FileIdentifier, options: OptionsReader): Promise<ImportedFile>;
}

export class FilesystemImporter extends PathBasedImporter {
  import(identifier: FileIdentifier, options: OptionsReader): Promise<ImportedFile> {
    return new Promise((resolve, reject) => {
      fs.readFile(identifier, 'utf-8', (err: any, data: string) => {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            identifier: identifier,
            defaultName: this.defaultName(identifier, options),
            contents: data
          });
        }
      });
    });
  }
}

/**
 * Default importer. Returns `ImportedFile` from disk
 * @param fromFile
 * @param importPath
 */
export let filesystemImporter = new FilesystemImporter();