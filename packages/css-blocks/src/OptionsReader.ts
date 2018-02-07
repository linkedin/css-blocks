import {
  CssBlockOptions,
  CssBlockOptionsReadonly,
  PluginOptions
} from "./options";

import {
  OutputMode
} from "./OutputMode";

import {
  filesystemImporter,
  Importer,
  ImporterData
} from "./importing";

import {
  BlockFactory
} from "./BlockFactory";

import {
  Preprocessors
} from "./preprocessing";

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
  readonly factory?: BlockFactory;
  readonly maxConcurrentCompiles: number;

  constructor(opts?: PluginOptions) {
    let defaults: CssBlockOptions = {
      outputMode: OutputMode.BEM,
      importer: filesystemImporter,
      rootDir: process.cwd(),
      data: {},
      preprocessors: {},
      disablePreprocessChaining: false,
      maxConcurrentCompiles: 4
    };
    Object.assign(this, defaults, opts || {});
  }
}
