import { whatever } from "@opticss/util";
import { existsSync, readFile } from "fs";
import * as path from "path";

import { ResolvedConfiguration } from "../configuration";

import { PathBasedImporter } from "./PathBasedImporter";
import { FileIdentifier, ImportedFile } from "./types";

export class FilesystemImporter extends PathBasedImporter {
  filesystemPath(identifier: FileIdentifier, _options: ResolvedConfiguration): string | null {
    if (path.isAbsolute(identifier) && existsSync(identifier)) {
      return identifier;
    } else {
      return null;
    }
  }
  import(identifier: FileIdentifier, configuration: ResolvedConfiguration): Promise<ImportedFile> {
    return new Promise((resolve, reject) => {
      readFile(identifier, "utf-8", (err: whatever, contents: string) => {
        if (err) {
          reject(err);
        }
        else {
          resolve({
            syntax: this.syntax(identifier, configuration),
            identifier,
            defaultName: this.defaultName(identifier, configuration),
            contents,
          });
        }
      });
    });
  }
}
