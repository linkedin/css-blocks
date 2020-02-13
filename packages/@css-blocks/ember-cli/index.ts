/* tslint:disable:prefer-unknown-to-any */
import BROCCOLI_CONCAT from "broccoli-concat";
import BROCCOLI_MERGE from "broccoli-merge-trees";

import { Addon, DEBUG } from "./src/_utils";
import { astPlugin } from "./src/astPlugin";
import { genTreeWrapper } from "./src/genTreeWrapper";
import { getEnv } from "./src/getEnv";
import { getOptions } from "./src/getOptions";
import { included } from "./src/included";
import { optionsForCacheInvalidation } from "./src/optionsForCacheInvalidation";

const cssBlocksAddon: Addon = {
  name: "@css-blocks/ember-cli",
  outputFile: "app.css",
  aggregateFile: "css-blocks.css",
  isDevelopingAddon() { return true; },
  transports: new Map(),
  _owners: new Set(),
  included,
  astPlugin,
  getEnv,
  getOptions,
  genTreeWrapper,
  optionsForCacheInvalidation,

  _modulePrefix(this: Addon): string {
    const parent = this.parent;
    let prefix = "";
    if (parent) {
      const config = typeof parent.config === "function" ? parent.config() || {} : {};
      const name: string = typeof parent.name === "function" ? parent.name() : parent.name;
      const moduleName: string = typeof parent.moduleName === "function" ? parent.moduleName() : parent.moduleName;
      prefix = moduleName || parent.modulePrefix || config.modulePrefix || name;
    }
    return prefix;
  },

  setupPreprocessorRegistry(type: string, registry: any): void {

    if (type !== "parent") { return; }

    DEBUG(`Registering handlebars AST plugin generators."`);

    // For Ember
    registry.add("htmlbars-ast-plugin", {
      name: "css-blocks-htmlbars",
      plugin: this.astPlugin.bind(this),
      dependencyInvalidation: true,
      cacheKey: () => this.optionsForCacheInvalidation(),
      baseDir: () => __dirname,
    });

    // For Glimmer
    registry.add("glimmer-ast-plugin", this.astPlugin.bind(this));
  },

  // TODO: This seems broken in Ember-CLI and should be fixed there.
  // In-repo addons of dummy apps that must depend on the addon that
  // contain it result in an infinite constructor loop. In order to
  // test in-app addon integration in this addon, we must explicitly
  // remote our dependency on the in-repo dummy addon. Not sure why
  // Ember-cli adds the in-repo dummy addon as a child of the main
  // addon...
  discoverAddons(this: Addon): void {
    this._super!.discoverAddons.apply(this, arguments);
    if (this.addonPackages) {
      delete this.addonPackages["in-repo-addon"];
      delete this.addonPackages["in-repo-engine"];
      delete this.addonPackages["in-repo-lazy-engine"];
    }
  },

  // At the very end of the build, append our CSS Blocks aggregate file to
  // the main `app.css` file. Un-link the destination file first to make sure
  // we don't modify the source file if broccoli sym-linked it all the way back.
  postprocessTree(this: Addon, name: string, tree: any): typeof BROCCOLI_MERGE {

    const aggregatorTree = this.env!.app.trees.cssblocks;

    // If this is not the root app, or the css tree, no-op.
    if (this.env!.isAddon || name !== "css" || !aggregatorTree) { return tree; }

    DEBUG(`Writing all CSS Blocks output to "${this.outputFile}".`);
    let merged = new BROCCOLI_MERGE([tree, aggregatorTree], { overwrite: true });
    merged = new BROCCOLI_CONCAT(merged, {
      outputFile: this.outputFile,
      inputFiles: [ this.outputFile, this.aggregateFile ],
      allowNone: true,
    });

    return new BROCCOLI_MERGE([tree, merged], { overwrite: true });
  },

};

/* tslint:disable-next-line no-default-export */
export = cssBlocksAddon;
