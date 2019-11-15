import { Syntax } from "@css-blocks/core";
import { existsSync } from "fs";
import * as glob from "glob";
import * as globEscape from "glob-escape";
import * as path from "path";

import { PathTransformer } from "./PathTransformer";

const TEMPLATES_DIR_RE = new RegExp(`${path.sep}templates${path.sep}`);
const STYLES_DIR_RE = new RegExp(`${path.sep}styles${path.sep}`);

export class EmberClassicTransformer implements PathTransformer {
  _syntaxes: Array<Syntax>;
  _templateExtension = "hbs";
  _allowsAnySyntax: boolean;

  constructor(syntaxes: Array<Syntax>) {
    this._syntaxes = syntaxes.filter(s => s !== Syntax.other);
    this._allowsAnySyntax = syntaxes.includes(Syntax.other);
  }

  _blockSyntaxSupported(extension: string): boolean {
    if (this._allowsAnySyntax || extension === "css") {
      return true;
    } else {
      return !!this._syntaxes.find(s => s === extension);
    }
  }

  templateToBlock(templatePath: string): string | null {
    let pathObj = path.parse(templatePath.replace(TEMPLATES_DIR_RE, `${path.sep}styles${path.sep}`));
    let dir = pathObj.dir;
    let filename = pathObj.name;
    let pattern = `${globEscape(filename)}.block.*`;
    let files = glob.sync(pattern, {cwd: dir});
    for (let file of files) {
      let ext = path.extname(file).substring(1);
      if (this._blockSyntaxSupported(ext)) {
        return path.join(dir, file);
      }
    }
    return null;
  }

  blockToTemplate(blockPath: string): string | null {
    let pathObj = path.parse(blockPath);
    delete pathObj.base;
    pathObj.ext = `.${this._templateExtension}`;
    if (pathObj.name.endsWith(".block")) {
      pathObj.name = pathObj.name.substring(0, pathObj.name.length - 6);
    }
    pathObj.dir = pathObj.dir.replace(STYLES_DIR_RE, `${path.sep}templates${path.sep}`);
    let templatePath = path.format(pathObj);
    if (existsSync(templatePath)) {
      return templatePath;
    } else {
      return null;
    }
  }
}
