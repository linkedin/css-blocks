import { Analyzer } from "@css-blocks/core";
import { TEMPLATE_TYPE } from "@css-blocks/ember-support";
import { TemplateIntegrationOptions } from "@opticss/template-api";

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
