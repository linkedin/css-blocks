import {
  Configuration,
} from "@css-blocks/core";
import { cosmiconfigSync as cosmiconfig, TransformSync } from "cosmiconfig";
import * as debugGenerator from "debug";
import merge = require("lodash.merge");
import { dirname, resolve } from "path";

const debug = debugGenerator("css-blocks:config");

type UnknownObject = {[k: string]: unknown};

/**
 * Resolves paths against the file's directory and recursively processes
 * the 'extends' option.
 *
 * If preprocessors is a string, attempts to load a javascript file from that location.
 */
const transform: TransformSync = (result) => {
  if (!result) return null;
  debug(`Processing raw configuration loaded from ${result.filepath}`);
  let dir = dirname(result.filepath);
  let config: UnknownObject = result.config;

  if (typeof config.rootDir === "string") {
    config.rootDir = resolve(dir, config.rootDir);
  }

  // if it's a string, load a file that exports one or more preprocessors.
  if (typeof config.preprocessors === "string") {
    let file = resolve(dir, config.preprocessors);
    debug(`Loading preprocessors from ${file}`);
    config.preprocessors = require(file) as UnknownObject;
  }

  // if it's a string, load a file that exports an importer and optionally some data.
  if (typeof config.importer === "string") {
    let file = resolve(dir, config.importer);
    debug(`Loading importer from ${file}`);
    let {importer, data} = require(file) as UnknownObject;
    config.importer = importer;
    if (data) {
      config.importerData = data;
    }
  }

  // If the config has an extends property, base this configuration on the
  // configuration loaded at that path relative to the directory of the current
  // configuration file.
  if (typeof config.extends === "string") {
    let baseConfigFile = resolve(dir, config.extends);
    delete config.extends;
    debug(`Extending configuration found at: ${baseConfigFile}`);
    let baseConfig = _load(baseConfigFile, transform);
    // we don't want to merge or copy the importer object or the importer data object.
    let importer = config.importer || baseConfig.importer;
    let importerData = config.importerData || baseConfig.importerData;
    config = merge({}, baseConfig, config);
    if (importer) {
      config.importer = importer;
    }
    if (importerData) {
      config.importerData = importerData;
    }
  }
  result.config = config;
  return result;
};

/**
 * This transform only runs on the final configuration file. It does not run on
 * any configuration file that is being extended.
 */
const transformFinal: TransformSync = (result) => {
  if (!result) return null;
  debug(`Using configuration file found at ${result.filepath}`);
  result = transform(result);
  if (!result) return null;
  if (!result.config.rootDir) {
    let dir = dirname(result.filepath);
    debug(`No rootDir specified. Defaulting to: ${dir}`);
    result.config.rootDir = dir;
  }
  return result;
};

const SEARCH_PLACES = [
  "package.json",
  "css-blocks.config.json",
  "css-blocks.config.js",
];

/**
 * Starting in the directory provided, work up the directory hierarchy looking
 * for css-blocks configuration files.
 *
 * This will look for a "css-blocks" key in package.json, then look for a file
 * named "css-blocks.config.json", then look for a file named "css-blocks.config.js".
 *
 * @param [searchDirectory] (optional) The directory to start looking in.
 *   Defaults to the current working directory.
 */
export function searchSync(searchDirectory?: string): Partial<Configuration> | null {
  let loader = cosmiconfig("css-blocks", {
    transform: transformFinal,
    searchPlaces: SEARCH_PLACES,
  });
  let result = loader.search(searchDirectory);
  return result && result.config as Partial<Configuration>;
}

/**
 * Async wrapper for searchSync for backwards compatibility.
 * @see {searchSync}
 */
export function search(searchDirectory?: string) {
  try {
    return Promise.resolve(searchSync(searchDirectory));
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Load configuration from a known path to the specific file.
 * Supports .js and .json files. If it's a file named "package.json",
 * it will load the configuration from the `"css-blocks"` property
 * of the package.json file.
 *
 * @param configPath path to the configuration file.
 * @throws If the file does not exist or is not readable.
 * @returns The options found
 */
export async function load(configPath: string): Promise<Partial<Configuration>> {
  return _load(configPath, transformFinal);
}

function _load(configPath: string, transform: TransformSync): Partial<Configuration> {
  let loader = cosmiconfig("css-blocks", {
    transform,
  });
  let result = loader.load(configPath);
  return result!.config as Partial<Configuration>;
}
