import { existsSync, readFile } from "fs-extra";
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
  async import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile> {
    return await readFile(identifier, "utf-8").then((contents: string) => {
      return {
        syntax: this.syntax(identifier, config),
        identifier,
        defaultName: this.defaultName(identifier, config),
        contents,
      };
    });
  }
}
