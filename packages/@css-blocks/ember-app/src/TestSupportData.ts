import { ObjectDictionary } from "@opticss/util";

export type DefaultBlockName = string;
export type RuntimeBlockName = string;
export type BlockId = string;
export type ExportedBlockGuid = {[exportedBlockName: string]: BlockId};

// Maps a user known block file name to its runtime name
// Note: Only blocks within the addon/apps namespace are exposed here as they
// represend the style interface that needs to be tested
// Example:
//   "blockNames": {
//     "hue-web-entity": "hue-web-entity-52c",
//     "application": "application-275",
//     "demo": "demo-275",
//   },
export type RuntimeBlockMapping = {[defaultBlockName: string]: RuntimeBlockName};

// Maps the set of blocks exported by each runtime block along with the blocks
// guid. This guid can be used by the runtime service to lookup the classname
// that's present on the element
// Example:
//   "exportedBlocks": {
//     "demo-275": {
//       "default": "61821",
//       "blah": "9d0a5",
//       "divider": "d80bc",
//       "text-heading": "50cad",
//     },
//   },
export type ExportedBlocks = ObjectDictionary<ExportedBlockGuid>;

export interface TestSupportData {
  runtimeBlockMapping: RuntimeBlockMapping;
  exportedBlocks: ExportedBlocks;
}
