import * as path from "path";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

import { FileIdentifier, ImportedFile, Importer } from "./types";

export abstract class PathBasedImporter implements Importer {
  identifier(fromFile: string | null, importPath: string, config: ResolvedConfiguration): string {
    let fromDir = fromFile ? path.dirname(fromFile) : config.rootDir;
    return path.resolve(fromDir, importPath);
  }
  defaultName(identifier: string, _config: ResolvedConfiguration): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
  filesystemPath(identifier: FileIdentifier, _config: ResolvedConfiguration): string | null {
    return identifier;
  }
  syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax {
    let filename = this.filesystemPath(identifier, config);
    if (filename) {
      let ext = path.extname(filename).substring(1);
      switch (ext) {
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
  debugIdentifier(identifier: FileIdentifier, config: ResolvedConfiguration): string {
    return path.relative(config.rootDir, identifier);
  }
  abstract import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile>;
}
