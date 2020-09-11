import { BlockId, DefaultBlockName, ExportedBlocks, RuntimeBlockMapping, RuntimeBlockName, TestSupportData } from "./TestSupportData";

export class TestSupportDataGenerator implements TestSupportData {
  runtimeBlockMapping: RuntimeBlockMapping;
  exportedBlocks: ExportedBlocks;
  constructor() {
   this.runtimeBlockMapping = {};
   this.exportedBlocks = {};
  }
  addRuntimeBlock(defaultName: DefaultBlockName, runtimeBlockName: RuntimeBlockName) {
    if (!this.runtimeBlockMapping[defaultName]) {
      this.runtimeBlockMapping[defaultName] = runtimeBlockName;
    }
  }
  addExportedBlockGuid(blockName: RuntimeBlockName, exportedBlockName: string,  guid: BlockId) {
    if (!this.exportedBlocks[blockName]) {
      this.exportedBlocks[blockName] = {};
    }
    this.exportedBlocks[blockName][exportedBlockName] = guid;
  }
  get data(): TestSupportData {
    return {
      runtimeBlockMapping: this.runtimeBlockMapping,
      exportedBlocks: this.exportedBlocks,
    };
  }
}
