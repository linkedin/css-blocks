import { Syntax } from "@css-blocks/core/dist/src";
import * as path from "path";

import { PathTransformer } from "./PathTransformer";

export class EmberClassicTransformer implements PathTransformer {
  _syntax: Syntax;
  _templateExtension = "hbs";

  // TODO: Accept an array of syntaxes that are set up in the preprocessor configuration.
  constructor(syntax: Syntax) {
    this._syntax = syntax;
  }

  templateToBlock(templatePath: string): string {
    return templatePath
      .replace(/.hbs$/, `.block.${this._syntax}`)
      .replace(
        new RegExp(`${path.sep}templates${path.sep}`),
        `${path.sep}styles${path.sep}`,
      );
  }

  blockToTemplate(blockPath: string): string {
    return blockPath
      .replace(new RegExp(`\.block\.${this._syntax}$`), `.${this._templateExtension}`)
      .replace(
        new RegExp(`${path.sep}styles${path.sep}`),
        `${path.sep}templates${path.sep}`,
      );
  }
}
