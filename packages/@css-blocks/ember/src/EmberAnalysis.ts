import { AnalysisImpl, Block, DEFAULT_EXPORT, TemplateValidatorOptions } from "@css-blocks/core";

import { HandlebarsTemplate, TEMPLATE_TYPE as HANDLEBARS_TEMPLATE } from "./HandlebarsTemplate";

export class EmberAnalysis extends AnalysisImpl<HANDLEBARS_TEMPLATE> {
  constructor(template: HandlebarsTemplate, block: Block | undefined, options: TemplateValidatorOptions) {
    super(template, options);
    if (block) {
      this.addBlock(DEFAULT_EXPORT, block);
    }
  }
}
