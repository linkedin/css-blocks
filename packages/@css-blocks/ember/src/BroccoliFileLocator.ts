import { pathToIdent } from "@css-blocks/ember-support";
import type { FS as MergedFS } from "fs-merger";

import { FileLocator } from "./FileLocator";

export type FS = Pick<MergedFS, "existsSync" | "entries">;

export class BroccoliFileLocator implements FileLocator {
  fs: FS;
  constructor(fs: FS) {
    this.fs = fs;
  }
  findStylesheetForTemplate(relativePathToTemplate: string, extensions: Array<string>): string | null {
    let possibleStylesheets = this.possibleStylesheetPathsForTemplate(relativePathToTemplate, extensions);
    return possibleStylesheets.find((s) => this.fs.existsSync(s)) || null;
  }
  blockIdentifier(relativePathToStylesheet: string): string {
    return pathToIdent(relativePathToStylesheet);
  }
  possibleTemplatePaths(): Array<string> {
    return this.fs.entries(".", {globs: ["**/*.hbs"]}).map(e => e.relativePath);
  }
  possibleStylesheetPathsForTemplate(templatePath: string, extensions: Array<string>): Array<string> {
    let path = templatePath.replace("/templates/", "/styles/");
    return extensions.map(ext => path.replace(/\.hbs$/, `.block.${ext}`));
  }
}
