import { ClassName } from "./ClassName";
import { Block, BlockObject } from "../Block";
import { OptionsReader } from "../OptionsReader";
import { TemplateAnalysis, TemplateInfo } from "../TemplateAnalysis";

export class StyleMapping<Template extends TemplateInfo> {
  template: Template;
  blocks: {
    [localName: string]: Block;
  };
  blockMappings: Map<BlockObject,ClassName[]>;

  constructor(template: Template) {
    this.template = template;
    this.blocks = {};
    this.blockMappings = new Map();
  }

  addBlockReference(name: string, block: Block) {
    this.blocks[name] = block;
  }

  addObjects(options: OptionsReader, ...objects: BlockObject[]) {
    objects.forEach(o => {
      this.blockMappings.set(o, o.cssClasses(options));
    });
  }

  mapObjects(...objects: BlockObject[]): ClassName[] {
    return objects.reduce<ClassName[]>((classes, o) => classes.concat(this.blockMappings.get(o) || []), []);
  }

  addBlock(localName: string | null, block: Block, options: OptionsReader) {
    this.blocks[localName || block.name] = block;
    block.all().forEach(o => {
      this.blockMappings.set(o, o.cssClass(options).split(/\s+/));
    });
  }
  static fromAnalysis<Template extends TemplateInfo>(analysis: TemplateAnalysis<Template>, options: OptionsReader): StyleMapping<Template> {
    let mapping = new StyleMapping<Template>(analysis.template);
    Object.keys(analysis.blocks).forEach(name => {
      mapping.addBlockReference(name, analysis.blocks[name]);
    });
    mapping.addObjects(options, ...analysis.stylesFound);
    return mapping;
  }
}