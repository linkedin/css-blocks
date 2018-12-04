import { existsSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import * as path from "path";
import * as process from "process";

export interface FileContent {
  [filename: string]: string | FileContent;
}

interface Transient {
  (filesObj: FileContent): void;
  restore: () => void;
  _files: string[];
  _directories: string[];
  readonly DIRECTORY: symbol;
}

function transientFS(filesObj: FileContent) {
  let keys = Object.keys(filesObj);
  for (let key of keys) {
    let content = filesObj[key];
    if (typeof content === "object") {
      let dir = process.cwd();
      try {
        if (!existsSync(key)) {
          mkdirSync(key);
          let fullPath = path.resolve(key);
          transient._directories.push(fullPath);
        }
        process.chdir(key);
        transientFS(content);
      }
      finally {
        process.chdir(dir);
      }
    } else {
      let fullPath = path.resolve(key);
      writeFileSync(fullPath, content);
      transient._files.push(fullPath);
    }
  }
}
const DIRECTORY = Symbol("transient directory");

function restore() {
  let file, dir;
  while (file = transient._files.pop()) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
  while (dir = transient._directories.pop()) {
    if (existsSync(dir)) {
      rmdirSync(dir);
    }
  }
}

const transient: Transient = Object.assign(transientFS, {
  _files: [],
  _directories: [],
  DIRECTORY,
  restore,
});

// tslint:disable-next-line no-default-export
export default transient;
