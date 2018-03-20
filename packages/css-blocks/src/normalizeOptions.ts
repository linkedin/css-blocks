import { Preprocessors } from "./BlockParser";
import {
  OutputMode,
} from "./OutputMode";
import {
  filesystemImporter,
  Importer,
  ImporterData,
} from "./importing";
import {
  Configuration,
  ConfigurationObjectKeys,
  ConfigurationSimpleKeys,
  Options,
  ResolvedConfiguration,
} from "./options";

const CONFIG_OBJECT_KEYS: Array<ConfigurationObjectKeys> = [
  "importerData",
  "preprocessors",
];
const CONFIG_SIMPLE_KEYS: Array<ConfigurationSimpleKeys> = [
  "outputMode",
  "importer",
  "rootDir",
  "disablePreprocessChaining",
  "maxConcurrentCompiles",
];
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
  private _opts: Configuration;

  constructor(options?: Options, defaults?: Options) {
    this._opts = {...DEFAULTS};
    this.setAll(defaults);
    this.setAll(options);
  }
  private setAll(opts: Options | undefined) {
    if (opts === undefined) return;
    for (let k of CONFIG_SIMPLE_KEYS) {
      let v = opts[k];
      if (v !== undefined) {
        this._opts[k] = v;
      }
    }
    for (let k of CONFIG_OBJECT_KEYS) {
      let v = opts[k];
      if (v !== undefined) {
        this._opts[k] = {...v};
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
