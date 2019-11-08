// TODO: Currently we are only supporting css. This should eventually support all
// of the file types supported by css blocks
export function isBlockFile(uriOrFsPath: string) {
  return uriOrFsPath.endsWith(".block.css");
}
