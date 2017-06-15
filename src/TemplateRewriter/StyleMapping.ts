import { ClassName } from "./ClassName";
import { Block, BlockObject } from "../Block";
import { OptionsReader } from "../options";

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
}