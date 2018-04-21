/**
 * This file takes heavy inspiration from other Broccoli Plugins written in
 * Typescript to provide sane typings for common Broccoli utilities.
 */
/* tslint:disable */
export const BroccoliPlugin: BroccoliPlugin.Static = require("broccoli-plugin");

export const walkSync: WalkSync = require("walk-sync");

declare function require(id: string): any;

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
  }
}
