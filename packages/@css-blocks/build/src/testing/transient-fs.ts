import { existsSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import * as path from "path";
import * as process from "process";

export interface FileContent {
  [filename: string]: string | FileContent;
}

export interface TransientFiles {
  (filesObj: FileContent): void;
  restore: () => void;
  _files: string[];
  _directories: string[];
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

const transient: TransientFiles = Object.assign(transientFS, {
  _files: [],
  _directories: [],
  restore,
});

// tslint:disable-next-line no-default-export
export default transient;
