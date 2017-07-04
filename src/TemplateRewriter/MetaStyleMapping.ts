import { StyleMapping } from "./StyleMapping";
import { MetaTemplateAnalysis } from "../TemplateAnalysis/MetaAnalysis";
import { TemplateInfo } from "../TemplateAnalysis";
import { OptionsReader } from "../options";

export class MetaStyleMapping<Template extends TemplateInfo> {
  templates: Map<string, StyleMapping<Template>>;
  constructor() {
    this.templates = new Map();
  }
  static fromMetaAnalysis<Template extends TemplateInfo>(analysis: MetaTemplateAnalysis<Template>, options: OptionsReader): MetaStyleMapping<Template> {
    let metaMapping = new MetaStyleMapping<Template>();
    analysis.eachAnalysis(a => {
      let mapping = StyleMapping.fromAnalysis<Template>(a, options);
      metaMapping.templates.set(a.template.identifier, mapping);
    });
    return metaMapping;
  }
}
