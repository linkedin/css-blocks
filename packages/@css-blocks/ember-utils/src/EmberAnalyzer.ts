import { Analyzer } from "@css-blocks/core";
import { TemplateIntegrationOptions } from "@opticss/template-api";

import { TEMPLATE_TYPE } from "./HandlebarsTemplate";

export class EmberAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  analyze(_dir: string, _entryPoints: string[]): Promise<Analyzer<"HandlebarsTemplate">> {
    throw new Error("Method not implemented.");
  }
  get optimizationOptions(): TemplateIntegrationOptions {
    return {
      rewriteIdents: {
        id: false,
        class: true,
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }
}
