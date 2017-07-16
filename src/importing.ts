import * as path from "path";
import * as fs from "fs";
import {
  OptionsReader
} from "./options";

/**
 * Structure that CSS Blocks uses to represent a single file.
 */
export interface ImportedFile {
  defaultName: string;
  path: string;
  contents: string;
}

/**
 * Interface for supported CSS Blocks file importers. All custom importers must
 * implement this shape.
 */
export interface Importer {
  import(fromFile: string | null, importPath: string, options: OptionsReader): Promise<ImportedFile>;
  getDefaultName(sourcePath: string, options: OptionsReader): string;
}

export class FilesystemImporter {
  import(fromFile: string | null, importPath: string, options: OptionsReader): Promise<ImportedFile> {
    let fromDir = fromFile ? path.dirname(fromFile) : options.rootDir;
    let resolvedPath = path.resolve(fromDir, importPath);
    return new Promise((resolve, reject) => {
      fs.readFile(resolvedPath, 'utf-8', (err: any, data: string) => {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            path: resolvedPath,
            defaultName: this.getDefaultName(resolvedPath, options),
            contents: data
          });
        }
      });
    });
  }
  getDefaultName(sourcePath: string, options: OptionsReader): string {
    sourcePath = path.resolve(options.rootDir, sourcePath);
    let name = path.parse(sourcePath).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
}

/**
 * Default importer. Returns `ImportedFile` from disk
 * @param fromFile
 * @param importPath
 */
export let filesystemImporter = new FilesystemImporter();