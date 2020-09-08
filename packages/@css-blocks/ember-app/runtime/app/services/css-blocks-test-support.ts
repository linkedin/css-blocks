/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
import CSSBlocksService from "./css-blocks";
import { mockTestData } from "./test-data";

export class CSSBlocksTestService extends CSSBlocksService {
  constructor() {
    /// @ts-ignore
    super(...arguments); // need to pass in ...arguments since "@ember/service" extends from EmberObject
    CSSBlocksTestService.enableDebugMode = true;
    console.log(mockTestData);
  }

  getBlock(moduleName: string, blockName: string): string {
    return `${moduleName}-${blockName}`;
  }
}
