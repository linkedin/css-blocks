import * as path from "path";
import * as fs from "fs";

export interface ImportedFile {
  defaultName: string;
  path: string;
  contents: string;
}

export interface Importer {
  (fromFile: string, importPath: string): Promise<ImportedFile>;
  getDefaultName(sourcePath: string): string;
}

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

filesystemImporter.getDefaultName = function(sourcePath: string): string {
  return path.parse(sourcePath).name;
};
