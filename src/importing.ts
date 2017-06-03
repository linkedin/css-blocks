import * as path from "path";
import * as fs from "fs";

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
  (fromFile: string, importPath: string): Promise<ImportedFile>;
  getDefaultName(sourcePath: string): string;
}

/**
 * Default importer. Returns `ImportedFile` from disk
 * @param fromFile
 * @param importPath
 */
export let filesystemImporter: Importer = <Importer>function(fromFile: string, importPath: string): Promise<ImportedFile> {
  let resolvedPath = path.resolve(path.dirname(fromFile), importPath);
  return new Promise((resolve, reject) => {
    fs.readFile(resolvedPath, 'utf-8', (err: any, data: string) => {
      if (err) {
        reject(err);
      }
      else {
        resolve({
          path: resolvedPath,
          defaultName: filesystemImporter.getDefaultName(resolvedPath),
          contents: data
        });
      }
    });
  });
};

/**
 * Return default name of the block. Ex: `test.block.css` => `test`.
 * @param sourcePath
 */
filesystemImporter.getDefaultName = function(sourcePath: string): string {
  let name = path.parse(sourcePath).name;
  if (name.endsWith(".block")) {
    name = name.substr(0, name.length - 6);
  }
  return name;
};
