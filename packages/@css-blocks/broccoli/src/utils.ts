/**
 * This file takes heavy inspiration from other Broccoli Plugins written in
 * Typescript to provide sane typings for common Broccoli utilities.
 */
/* tslint:disable */
declare function require(id: string): any;

export const BroccoliPlugin: BroccoliPlugin.Static = require("broccoli-plugin");
export const symlinkOrCopy: (a: string, b: string) => void = require("symlink-or-copy").sync;
export const FSTree: FSTree.Static = require("fs-tree-diff");
export const FSEntry: FSTree.Entry = require("fs-tree-diff/lib/entry.js");
export const walkSync: WalkSync = require("walk-sync");

export namespace FSTree {
  export interface Entry {
    relativePath: string;
    mode: number;
    size: number;
    mtime: Date;
    isDirectory(): boolean;
    fromStat(relativePath: string, stat: any): Entry;
  }
  export type ChangeType = "unlink" | "rmdir" | "mkdir" | "create" | "change";
  export type Patch = [ChangeType, string, Entry];
  export interface FSTree {
    calculatePatch(tree: FSTree): Patch[];
    calculateAndApplyPatch(tree: FSTree, inputDir: string, outputDir: string): void;
  }
  export interface Options {
    entries: Entry[];
  }
  export interface Static {
    new(options?: Options): FSTree;
    fromPaths(paths: string[]): FSTree;
    fromEntries(entries: Entry[]): FSTree;
    applyPatch(inputDir: string, outputDir: string, patch: Patch[]): void;
  }
}

export namespace BroccoliPlugin {
  export interface PluginOptions {
    name?: string;
    annotation?: string;
    persistentOutput?: boolean;
  }

  export interface Plugin {
    inputPaths: string[];
    outputPath: string;
    cachePath: string;
  }

  export interface Static {
    new(inputNodes: any[], options?: any): Plugin;
  }
}

export interface WalkSync {
  (path: string, options?: any): string[];
  entries(path: string, options?: any): WalkSync.Entry[];
}

export namespace WalkSync {
  export type Row = string | RegExp[];

  export interface Entry {
    relativePath: string;
    basePath: string;
    fullPath: string;
    checksum: string;
    mode: number;
    size: number;
    mtime: Date;
    isDirectory(): boolean;
    fromStat(relativePath: string, stat: any): Entry;
  }
}
