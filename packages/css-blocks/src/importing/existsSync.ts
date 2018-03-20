import * as fs from "fs";

// This is only exported for use in this module, it's not exported by the
// 'importing' module.
export function existsSync(path: string) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}
