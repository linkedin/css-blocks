import config from "@css-blocks/config";
import { NodeJsImporter } from "@css-blocks/core";

import { AddonOptions, Env } from "./_utils";

export function getOptions(env: Env): AddonOptions {

  let { isEmber, app, rootDir } = env;

  if (!app.options["css-blocks"]) {
    app.options["css-blocks"] = {};
  }

  // Get CSS Blocks options provided by the application, if present.
  const options = app.options["css-blocks"]; // Do not clone! Contains non-json-safe data.
  options.aliases      = options.aliases || {};
  options.analysisOpts = options.analysisOpts || {};
  options.optimization = options.optimization || {};

  if (!options.parserOpts) {
    options.parserOpts = config.search(rootDir) || {};
  }

  // Use the node importer by default.
  options.parserOpts.importer = options.parserOpts.importer || new NodeJsImporter(options.aliases);

  // Optimization is always disabled for now, until we get project-wide analysis working.
  if (typeof options.optimization.enabled === "undefined") {
    options.optimization.enabled = app.isProduction;
  }

  // Update parserOpts to include the absolute path to our application code directory.
  if (!options.parserOpts.rootDir) {
    options.parserOpts.rootDir = rootDir;
  }
  options.parserOpts.outputMode = "BEM_UNIQUE";

  if (options.output !== undefined && typeof options.output !== "string") {
    throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Output must be a string or array. Instead received ${options.output}.`);
  }
  if (!isEmber && typeof options.entry !== "string" && !Array.isArray(options.entry)) {
    throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Entry must be a string or array. Instead received ${options.entry}.`);
  }
  if (isEmber && options.entry) {
    throw new Error(`CSS Blocks entry points are auto-discovered in Ember apps. Do not pass an "entry" option in your CSS Blocks config.`);
  }

  return options;
}
