import {
  CssBlockOptionsReadonly,
  PluginOptions,
} from "./options";

import { OutputMode } from "./OutputMode";

import {
  filesystemImporter,
  Importer,
  ImporterData,
} from "./importing";

import { Preprocessors } from "./BlockParser";

/**
 * Provides read-only access to options values. Provides default values if none
 * passed.
 */
export class OptionsReader implements CssBlockOptionsReadonly {
  readonly outputMode: OutputMode;
  readonly importer: Importer;
  readonly rootDir: string;
  readonly data: ImporterData;
  readonly preprocessors: Preprocessors;
  readonly disablePreprocessChaining: boolean;
  readonly maxConcurrentCompiles: number;

  constructor(opts: PluginOptions = {}) {
    this.outputMode = opts.outputMode || OutputMode.BEM;
    this.importer = opts.importer || filesystemImporter;
    this.rootDir = opts.rootDir || process.cwd();
    this.data = opts.data || {};
    this.preprocessors = opts.preprocessors || {};
    this.disablePreprocessChaining = !!opts.disablePreprocessChaining;
    this.maxConcurrentCompiles = opts.maxConcurrentCompiles || 4;
  }
}
