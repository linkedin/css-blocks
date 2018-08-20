/**
 * This file takes heavy inspiration from other Broccoli Plugins written in
 * Typescript to provide sane typings for common Broccoli utilities.
 */
/* tslint:disable */
declare function require(id: string): any;

export const BroccoliPlugin: BroccoliPlugin.Static = require("broccoli-plugin");
export const symlinkOrCopy: (a: string, b: string) => void = require("symlink-or-copy").sync;

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
