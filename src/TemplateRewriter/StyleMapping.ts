import { ClassName } from "./ClassName";
import { Block, BlockObject } from "../Block";
import { OptionsReader } from "../options";
import { TemplateAnalysis } from "../TemplateAnalysis";

export class StyleMapping {
  blocks: {
    [localName: string]: Block;
  };
  blockMappings: Map<BlockObject,ClassName[]>;

  constructor() {
    this.blocks = {};
    this.blockMappings = new Map();
  }

  addBlockReference(name: string, block: Block) {
    this.blocks[name] = block;
  }

  addObjects(options: OptionsReader, ...objects: BlockObject[]) {
    objects.forEach(o => {
      this.blockMappings.set(o, o.cssClass(options).split(/\s+/));
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
  static fromAnalysis(analysis: TemplateAnalysis, options: OptionsReader): StyleMapping {
    let mapping = new StyleMapping();
    Object.keys(analysis.blocks).forEach(name => {
      mapping.addBlockReference(name, analysis.blocks[name]);
    });
    mapping.addObjects(options, ...analysis.stylesFound);
    return mapping;
  }
}