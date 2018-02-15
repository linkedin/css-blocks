import { TemplateIntegrationOptions } from "@opticss/template-api";

import { Block } from "../Block";

export interface StyleAnalysis {
  blockDependencies(): Set<Block>;
  transitiveBlockDependencies(): Set<Block>;
  optimizationOptions(): TemplateIntegrationOptions;
}
