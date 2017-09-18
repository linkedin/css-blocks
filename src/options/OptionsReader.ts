import * as path from "path";

import {
  PluginOptions,
  CssBlockOptionsReadonly
} from "./index";

import OutputMode from "./OutputMode";
import TypesMode from "./TypesMode";

import {
  Importer,
  filesystemImporter,
  ImporterData
} from "../importing";

import {
  Preprocessors
} from "../preprocessing";

import {
  BlockFactory
} from "../Block/BlockFactory";

/**
 * Provides read-only access to options values. Provides default values if none
 * passed.
 */
export default class OptionsReader implements CssBlockOptionsReadonly {
  readonly outputMode: OutputMode;
  readonly interoperableCSS: boolean;
  readonly importer: Importer;
  readonly rootDir: string;
  readonly data: ImporterData;
  readonly preprocessors: Preprocessors;
  readonly disablePreprocessChaining: boolean;
  readonly factory?: BlockFactory;
  readonly maxConcurrentCompiles: number;
  readonly generateTypes: TypesMode;
  readonly typesPath: string;

  constructor(opts?: PluginOptions) {
    let defaults = {
      outputMode: OutputMode.BEM,
      generateTypes: TypesMode.NONE,
      typesPath: path.join(process.cwd(), '.cssblocks'),
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
