import {
  Options,
  ResolvedConfiguration,
} from "./options";

import { OutputMode } from "./OutputMode";

import {
  filesystemImporter,
  Importer,
  ImporterData,
} from "./importing";

import { Preprocessors } from "./BlockParser";

const DEFAULTS: ResolvedConfiguration = {
  outputMode: OutputMode.BEM,
  importer: filesystemImporter,
  rootDir: process.cwd(),
  importerData: {},
  preprocessors: {},
  disablePreprocessChaining: false,
  maxConcurrentCompiles: 4,
};

/**
 * Provides read-only access to options values. Provides default values if none
 * passed.
 */
class OptionsReader implements ResolvedConfiguration {
  private _opts: ResolvedConfiguration;

  constructor(options: Options = {}, defaults: Options = {}) {
    this._opts = {...DEFAULTS};
    for (let k of Object.keys(defaults)) {
      if (defaults[k] !== undefined) {
        this._opts[k] = defaults[k];
      }
    }
    for (let k of Object.keys(options)) {
      if (options[k] !== undefined) {
        this._opts[k] = options[k];
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
}

export function normalizeOptions(options: Options | undefined, defaults?: Options): ResolvedConfiguration {
  if (options instanceof OptionsReader) {
    return options;
  } else {
    return new OptionsReader(options, defaults);
  }
}
