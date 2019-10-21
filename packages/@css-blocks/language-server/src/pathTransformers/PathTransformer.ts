import { Syntax } from "@css-blocks/core/dist/src";

export interface PathTransformer {
  _syntax: Syntax;
  templateToBlock(templatePath: string): string;
  blockToTemplate(blockPath: string): string;
}
