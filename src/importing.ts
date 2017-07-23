import * as path from "path";
import * as fs from "fs";
import {
  CssBlockOptionsReadonly
} from "./options";
import {
  Syntax
} from "./preprocessing";

declare module "./options" {
  export interface CssBlockOptions {
    importer: Importer;
    data: ImporterData;
  }
}

export interface ImporterData {
  [key: string]: any;
}

/**
 * A FileIdentifier is a string with a whatever internal encoding is needed to uniquely resolve
 * a file or relative importPath against the identifier by an importer. FileIdentifiers may be
 * serialized across processes and should not encode any transient state. If an importer
 * wraps another importer, it is responsible for mangling and demangling the import identifier to
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
  identifier(fromIdentifier: FileIdentifier | null, importPath: string, options: CssBlockOptionsReadonly): FileIdentifier;
  /**
   * import the file with the given metadata and return a string and meta data for it.
   */
  import(identifier: FileIdentifier, options: CssBlockOptionsReadonly): Promise<ImportedFile>;
  /**
   * the default name of the block used unless the block specifies one itself.
   */
  defaultName(identifier: FileIdentifier, options: CssBlockOptionsReadonly): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  filesystemPath(identifier: FileIdentifier, options: CssBlockOptionsReadonly): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  inspect(identifier: FileIdentifier, options: CssBlockOptionsReadonly): string;
  /**
   * returns the syntax the contents are written in.
   */
  syntax(identifier: FileIdentifier, options: CssBlockOptionsReadonly): Syntax;
}

export abstract class PathBasedImporter implements Importer {
  identifier(fromFile: string | null, importPath: string, options: CssBlockOptionsReadonly): string {
    let fromDir = fromFile ? path.dirname(fromFile) : options.rootDir;
    return path.resolve(fromDir, importPath);
  }
  defaultName(identifier: string, _options: CssBlockOptionsReadonly): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
  filesystemPath(identifier: FileIdentifier, _options: CssBlockOptionsReadonly): string | null {
    return identifier;
  }
  syntax(identifier: FileIdentifier, options: CssBlockOptionsReadonly): Syntax {
    let filename = this.filesystemPath(identifier, options);
    if (filename) {
      let ext = path.extname(filename).substring(1);
      switch(ext) {
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
  inspect(identifier: FileIdentifier, options: CssBlockOptionsReadonly): string {
    return path.relative(options.rootDir, identifier);
  }
  abstract import(identifier: FileIdentifier, options: CssBlockOptionsReadonly): Promise<ImportedFile>;
}

export class FilesystemImporter extends PathBasedImporter {
  filesystemPath(identifier: FileIdentifier, _options: CssBlockOptionsReadonly): string | null {
    if (path.isAbsolute(identifier) && existsSync(identifier)) {
      return identifier;
    } else {
      return null;
    }
  }
  import(identifier: FileIdentifier, options: CssBlockOptionsReadonly): Promise<ImportedFile> {
    return new Promise((resolve, reject) => {
      fs.readFile(identifier, 'utf-8', (err: any, data: string) => {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            syntax: this.syntax(identifier, options),
            identifier: identifier,
            defaultName: this.defaultName(identifier, options),
            contents: data
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
  } catch(e) {
    console.error(e);
    return false;
  }
}

/**
 * Default importer. Returns `ImportedFile` from disk
 * @param fromFile
 * @param importPath
 */
export let filesystemImporter = new FilesystemImporter();