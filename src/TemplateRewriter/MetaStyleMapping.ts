import * as debugGenerator from "debug";

import { StyleMapping } from "./StyleMapping";
import { MetaTemplateAnalysis } from "../TemplateAnalysis/MetaAnalysis";
import { TemplateInfo, TemplateTypes } from "@opticss/template-api";
import { OptionsReader } from "../OptionsReader";

let debug = debugGenerator("css-blocks");

export class MetaStyleMapping<Template extends TemplateInfo<keyof TemplateTypes>> {
  templates: Map<string, StyleMapping<keyof TemplateTypes, Template>>;
  constructor() {
    this.templates = new Map();
  }
  static fromMetaAnalysis<Template extends TemplateInfo<keyof TemplateTypes>>(analysis: MetaTemplateAnalysis<Template>, options: OptionsReader): MetaStyleMapping<Template> {
    debug("Creating MetaStyleMapping from MetaAnalysis");
    let metaMapping = new MetaStyleMapping<Template>();
    analysis.eachAnalysis(a => {
      debug(`Creating mapping for ${a.template.identifier}`);
      let mapping = StyleMapping.fromAnalysis<keyof TemplateTypes,Template>(a, options);
      metaMapping.templates.set(a.template.identifier, mapping);
    });
    return metaMapping;
  }
}
