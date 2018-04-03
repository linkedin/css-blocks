import * as path from "path";

import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";

import { FileIdentifier, ImportedFile, Importer } from "./types";

export abstract class PathBasedImporter implements Importer {
  identifier(fromFile: string | null, importPath: string, configuration: ResolvedConfiguration): string {
    let fromDir = fromFile ? path.dirname(fromFile) : configuration.rootDir;
    return path.resolve(fromDir, importPath);
  }
  defaultName(identifier: string, _options: ResolvedConfiguration): string {
    let name = path.parse(identifier).name;
    if (name.endsWith(".block")) {
      name = name.substr(0, name.length - 6);
    }
    return name;
  }
  filesystemPath(identifier: FileIdentifier, _options: ResolvedConfiguration): string | null {
    return identifier;
  }
  syntax(identifier: FileIdentifier, configuration: ResolvedConfiguration): Syntax {
    let filename = this.filesystemPath(identifier, configuration);
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
  debugIdentifier(identifier: FileIdentifier, configuration: ResolvedConfiguration): string {
    return path.relative(configuration.rootDir, identifier);
  }
  abstract import(identifier: FileIdentifier, configuration: ResolvedConfiguration): Promise<ImportedFile>;
}
