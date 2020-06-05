import { Preprocessors } from "../BlockParser";
import {
  Importer,
  ImporterData,
  defaultImporter,
} from "../importing";

import { OutputMode } from "./OutputMode";
import {
  Configuration,
  Options,
  ResolvedConfiguration,
} from "./types";

const OBJECT_KEYS = [
  "importerData",
  "preprocessors",
] as const;

const SIMPLE_KEYS = [
  "outputMode",
  "importer",
  "rootDir",
  "disablePreprocessChaining",
  "maxConcurrentCompiles",
] as const;

const DEFAULTS: ResolvedConfiguration = {
  outputMode: OutputMode.BEM,
  importer: defaultImporter,
  rootDir: "",
  importerData: {},
  preprocessors: {},
  disablePreprocessChaining: false,
  maxConcurrentCompiles: 4,
  guidAutogenCharacters: 5,
};

/**
 * Provides read-only access to resolved configuration values.
 * Provides default values for any unspecified configuration values.
 */
class Resolver implements ResolvedConfiguration {
  private _opts: Configuration;

  constructor(options?: Options, defaults?: Options) {
    this._opts = { ...DEFAULTS };
    this.setAll({rootDir: process.cwd()});
    this.setAll(defaults);
    this.setAll(options);
  }
  private setAll(opts: Options | undefined) {
    if (opts === undefined) return;

    for (let k of SIMPLE_KEYS) {
      if (opts[k] !== undefined) {
        // XXX this cast is annoying
        (<{}>this._opts)[k] = opts[k];
      }
    }

    for (let k of OBJECT_KEYS) {
      let v = opts[k];
      if (v !== undefined) {
        this._opts[k] = { ...v };
      }
    }
  }
  get outputMode(): OutputMode {
    return this._opts.outputMode;
  }
  get importer(): Importer {
    return this._opts.importer;
  }
  get rootDir(): string {
    return this._opts.rootDir;
  }
  get importerData(): ImporterData {
    return this._opts.importerData;
  }
  get preprocessors(): Preprocessors {
    return this._opts.preprocessors;
  }
  get disablePreprocessChaining(): boolean {
    return this._opts.disablePreprocessChaining;
  }
  get maxConcurrentCompiles(): number {
    return this._opts.maxConcurrentCompiles;
  }
  get guidAutogenCharacters(): number {
    return this._opts.guidAutogenCharacters;
  }
}

export function resolveConfiguration(
  options: Options | undefined,
  defaults?: Options,

): ResolvedConfiguration {
  if (options instanceof Resolver) {
    return options;
  } else {
    return new Resolver(options, defaults);
  }
}
