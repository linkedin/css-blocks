// Maps a user known block file to the set of blocks exported by each runtime block along with the blocks
// guid. This guid can be used by the runtime service to lookup the classname
// that's present on the element
// Note: Only blocks within the addon/apps namespace are exposed here as they
// represend the style interface that needs to be tested
// Example:
// var testSupportData = {
//   "hue-web-entities/styles/components/hue-web-entity": {
//     "default": "97d83"
//   },
//   "dummy/styles/application": {
//     "default": "08b2d"
//   },
//   "dummy/styles/demo": {
//     "default": "61821",
//     "container": "9d0a5",
//     "divider": "d80bc",
//     "text-heading": "50cad"
//   }
// };
export type BlockId = string;
export type ExportedBlockGuids = {[exportedBlockName: string]: BlockId};
export type TestSupportData = {[filePath: string]: ExportedBlockGuids};
