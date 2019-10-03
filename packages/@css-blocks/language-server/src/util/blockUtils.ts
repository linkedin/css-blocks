import { CssBlockError, Syntax } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";
import { postcss } from "opticss";
import * as path from "path";

// TODO: Currently we are only supporting css. This should eventually support all
// of the file types supported by css blocks
export function isBlockFile(uriOrFsPath: string) {
  return uriOrFsPath.endsWith(".block.css");
}

export async function parseBlockErrors(parser: BlockParser, blockFsPath: string, sourceText: string): Promise<CssBlockError[]> {
  let errors: CssBlockError[] = [];

  try {
    await parser.parseSource({
      identifier: blockFsPath,
      defaultName: path.parse(blockFsPath).name.replace(/\.block/, ""),
      originalSource: sourceText,
      originalSyntax: Syntax.css,
      parseResult: postcss.parse(sourceText, { from: blockFsPath }),
      dependencies: [],
    });
  } catch (error) {
    if (error instanceof CssBlockError) {
      errors = errors.concat(error);
    }
  }

  return errors;
}
