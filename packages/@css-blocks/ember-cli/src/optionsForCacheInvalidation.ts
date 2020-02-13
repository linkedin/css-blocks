import { Importer } from "@css-blocks/core";

import { Addon, AddonCacheOptions } from "./_utils";

export function optionsForCacheInvalidation(this: Addon): AddonCacheOptions {
  let aliases = this._options!.aliases;
  let analysisOpts = this._options!.analysisOpts;
  let optimization = this._options!.optimization;
  let parserOpts = {
    ...this._options!.parserOpts,
  };
  let constructor = parserOpts.importer && parserOpts.importer.constructor;
  if (constructor) {
    // this may seem strange but we're turning the Importer into a string key
    // so that it can be used as a cache key.
    parserOpts.importer = constructor.name as unknown as Importer;
  } else {
    delete parserOpts.importer;
  }

  return {
    aliases,
    analysisOpts,
    optimization,
    parserOpts,
  };
}
