import {
  CssBlockOptions,
  PluginOptions,
  CssBlockOptionsReadonly
} from "./options";

import {
  OutputMode
} from "./OutputMode";

import {
  Importer,
  filesystemImporter,
  ImporterData
} from "./importing";

import {
  Preprocessors
} from "./preprocessing";

import {
  BlockFactory
} from "./Block/BlockFactory";

/**
 * Provides read-only access to options values. Provides default values if none
 * passed.
 */
export class OptionsReader implements CssBlockOptionsReadonly {
  readonly outputMode: OutputMode;
  readonly interoperableCSS: boolean;
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
      interoperableCSS: false,
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
