import { Block } from "../Block";
import { TemplateIntegrationOptions } from "@opticss/template-api";

export interface StyleAnalysis {
  blockDependencies(): Set<Block>;
  transitiveBlockDependencies(): Set<Block>;
  optimizationOptions(): TemplateIntegrationOptions;
}
