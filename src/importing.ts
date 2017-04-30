import * as path from "path";
import * as fs from "fs";

export interface ImportedFile {
  path: string;
  contents: string;
}

export type Importer = (fromFile: string, path: string) => Promise<ImportedFile>;

export function filesystemImporter(fromFile: string, importPath: string): Promise<ImportedFile> {
  let resolvedPath = path.resolve(fromFile, importPath);
  return new Promise((resolve, reject) => {
    fs.readFile(resolvedPath, 'utf-8', (err: any, data: string) => {
      if (err) {
        reject(err);
      }
      else {
        resolve({
          path: resolvedPath,
          contents: data
        });
      }
    });
  });
}
