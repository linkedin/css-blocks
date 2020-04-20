import type * as fs from "fs";
import * as path from "path";

interface FS {
  existsSync: typeof fs["existsSync"];
  mkdirSync: typeof fs["mkdirSync"];
}

export function mkdirpSync(fs: FS, dir: string): void {
  let dirsToMake = new Array<string>();
  while (!fs.existsSync(dir)) {
    dirsToMake.unshift(dir);
    dir = path.dirname(dir);
  }
  for (let dir of dirsToMake) {
    fs.mkdirSync(dir);
  }
}
