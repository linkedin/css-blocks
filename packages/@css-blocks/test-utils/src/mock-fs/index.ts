import { existsSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import * as path from "path";
import * as process from "process";

export interface FileContent {
  [filename: string]: string | FileContent;
}

export interface FileMocker {
  (filesObj: FileContent): void;
  restore: () => void;
  fileCount: () => number;
}

const FILES: string[] = [];
const DIRS: string[] = [];

export const mock = <FileMocker>function mock(filesObj: FileContent) {
  let keys = Object.keys(filesObj);
  for (let key of keys) {
    let content = filesObj[key];
    if (typeof content === "object") {
      let dir = process.cwd();
      try {
        if (!existsSync(key)) {
          mkdirSync(key);
          let fullPath = path.resolve(key);
          DIRS.push(fullPath);
        }
        process.chdir(key);
        mock(content);
      }
      finally {
        process.chdir(dir);
      }
    } else {
      let fullPath = path.resolve(key);
      writeFileSync(fullPath, content);
      FILES.push(fullPath);
    }
  }
};

mock.restore = function restore() {
  let file, dir;
  while (file = FILES.pop()) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
  while (dir = DIRS.pop()) {
    if (existsSync(dir)) {
      rmdirSync(dir);
    }
  }
};

mock.fileCount = function fileCount(): number {
  return FILES.length;
};
