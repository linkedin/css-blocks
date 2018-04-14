import {
  FileIdentifier,
  ImportedFile,
  Importer,
  PathBasedImporter,
  ResolvedConfiguration as CSSBlocksConfiguration,
  filesystemImporter,
} from "@css-blocks/core";
import * as path from "path";

import { GlimmerProject, ResolvedPath } from "./GlimmerProject";
import { parseSpecifier } from "./utils";

const glimmerImportIdentifier = /^glimmer:(.+)$/;

export class GlimmerImporter extends PathBasedImporter {
  project: GlimmerProject;
  otherImporter: Importer;
  constructor(project: GlimmerProject, otherImporter?: Importer) {
    super();
    this.project = project;
    this.otherImporter = otherImporter || filesystemImporter;
  }
  demangle(identifier: FileIdentifier | null): string | null {
    if (identifier && glimmerImportIdentifier.exec(identifier)) {
      return RegExp.$1;
    } else if (identifier && parseSpecifier(identifier)) {
      return identifier;
    } else {
      return null;
    }
  }
  defaultName(identifier: FileIdentifier, options: CSSBlocksConfiguration) {
    let specifier = this.demangle(identifier);
    if (specifier) {
      let parsedSpecifier = parseSpecifier(specifier);
      if (parsedSpecifier) {
        return path.basename(parsedSpecifier.componentName);
      } else {
        throw new Error(`${identifier} is not a glimmer specifier.`);
      }
    } else {
      return this.otherImporter.defaultName(identifier, options);
    }
  }
  identifier(fromFile: FileIdentifier | null, importPath: string, options: CSSBlocksConfiguration): FileIdentifier {
    let referrer = this.demangle(fromFile) || undefined;
    let resolution: ResolvedPath | null;
    try {
      resolution = this.project.resolveStylesheet(importPath, referrer);
    } catch (e) {
      try {
        // might be absolute already try again
        resolution = this.project.resolveStylesheet(importPath);
      } catch (e2) {
        resolution = null;
      }
    }

    if (resolution === null) {
      let specifier = parseSpecifier(importPath);
      if (specifier) {
        // If it's a glimmer specifier, just return it.
        if (specifier.componentName && specifier.componentType) {
          return `glimmer:${specifier.componentType}:${specifier.componentName}`;
        }
        throw new Error(`Could not resolve Glimmer specifier '${referrer}' to a file.`);
      }
    }
    if (resolution) {
      return `glimmer:${resolution.specifier}`;
    } else {
      if (referrer) {
        let refResolution = this.project.resolve(referrer);
        if (refResolution) {
          try {
            fromFile = this.otherImporter.identifier(null, refResolution.fullPath, options);
          } catch (e) {
            // >_< The other importer doesn't understand file paths, we'll try it without.
            fromFile = null;
          }
          return this.otherImporter.identifier(fromFile, importPath, options);
        } else {
          throw new Error(`Could not resolve Glimmer specifier '${referrer}' to a file.`);
        }
      } else {
        return this.otherImporter.identifier(fromFile, importPath, options);
      }
    }
  }
  filesystemPath(identifier: string, options: CSSBlocksConfiguration): string | null {
    let specifier = this.demangle(identifier);
    if (specifier) {
      let resolution = this.project.resolve(specifier);
      if (resolution) {
        return resolution.fullPath;
      } else {
        return null;
      }
    } else {
      return this.otherImporter.filesystemPath(identifier, options);
    }
  }
  debugIdentifier(identifier: string, options: CSSBlocksConfiguration): string {
    let specifier = this.demangle(identifier);
    if (specifier) {
      let resolution = this.project.resolve(specifier);
      if (resolution) {
        return this.project.relativize(resolution.fullPath);
      } else {
        return specifier;
      }
    } else {
      return this.otherImporter.debugIdentifier(identifier, options);
    }
  }
  import(identifier: FileIdentifier, options: CSSBlocksConfiguration): Promise<ImportedFile> {
    let specifier = this.demangle(identifier);
    if (specifier) {
      let resolution = this.project.resolveFile(specifier);
      if (resolution) {
        return Promise.resolve({
          syntax: this.syntax(identifier, options),
          identifier: identifier,
          contents: resolution.string,
          defaultName: this.defaultName(identifier, options),
        });
      } else {
        return Promise.reject(new Error(`File not found for ${specifier}`));
      }
    } else {
      return this.otherImporter.import(identifier, options);
    }
  }
}
