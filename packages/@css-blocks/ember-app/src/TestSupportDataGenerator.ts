import { BlockId, TestSupportData } from "./TestSupportData";

export class TestSupportDataGenerator {
  runtimeBlockMapping: TestSupportData;
  constructor() {
   this.runtimeBlockMapping = {};
  }
  addExportedBlockGuid(filePath: string, exportedBlockName: string,  guid: BlockId) {
    if (!this.runtimeBlockMapping[filePath]) {
      this.runtimeBlockMapping[filePath] = {};
    }
    this.runtimeBlockMapping[filePath][exportedBlockName] = guid;
  }
  get data(): TestSupportData {
    return this.runtimeBlockMapping;
  }
}
