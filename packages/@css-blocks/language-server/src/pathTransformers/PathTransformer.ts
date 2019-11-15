export interface PathTransformer {
  templateToBlock(templatePath: string): string | null;
  blockToTemplate(blockPath: string): string | null;
}
