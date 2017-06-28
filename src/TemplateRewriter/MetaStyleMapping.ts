import { StyleMapping } from "./StyleMapping";
import { MetaTemplateAnalysis } from "../TemplateAnalysis/MetaAnalysis";
import { TemplateAnalysis } from "../TemplateAnalysis";
import { OptionsReader } from "../options";

export class MetaStyleMapping {
  templates: Map<string, StyleMapping>;
  constructor() {
    this.templates = new Map();
  }
  static fromMetaAnalysis(analysis: MetaTemplateAnalysis<TemplateAnalysis>, options: OptionsReader): MetaStyleMapping {
    let metaMapping = new MetaStyleMapping();
    analysis.eachAnalysis(a => {
      let mapping = new StyleMapping();
      Object.keys(a.blocks).forEach(name => {
        mapping.addBlockReference(name, a.blocks[name]);
      });
      mapping.addObjects(options, ...a.stylesFound);
      metaMapping.templates.set(a.template.path, mapping);
    });
    return metaMapping;
  }
}
