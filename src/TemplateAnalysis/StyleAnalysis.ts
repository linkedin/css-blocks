import { BlockObject, Block } from "../Block";
import { TemplateIntegrationOptions } from "@opticss/template-api";

export interface StyleAnalysis {
  wasFound(style: BlockObject): boolean;
  areCorrelated(...styles: BlockObject[]): boolean;
  blockDependencies(): Set<Block>;
  transitiveBlockDependencies(): Set<Block>;
  optimizationOptions(): TemplateIntegrationOptions;
}
