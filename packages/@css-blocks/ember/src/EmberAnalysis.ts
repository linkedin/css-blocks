import { AnalysisImpl, TemplateValidatorOptions } from "@css-blocks/core";

import { HandlebarsTemplate, TEMPLATE_TYPE as HANDLEBARS_TEMPLATE } from "./HandlebarsTemplate";

export class EmberAnalysis extends AnalysisImpl<HANDLEBARS_TEMPLATE> {
  constructor(template: HandlebarsTemplate, options: TemplateValidatorOptions) {
    super(template, options);
  }
}
