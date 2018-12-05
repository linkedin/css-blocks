import { Preprocessors } from "../BlockFactory";
import { Importer, ImporterData } from "../Importer";

import { OutputMode } from "./OutputMode";

/**
 * Options used by css-blocks for compilation.
 */
export interface Configuration {
  outputMode: OutputMode;
  rootDir: string;
  /**
   * Limits block parsing and compilation to this number at any one time.
   * Defaults to: 4
   */
  maxConcurrentCompiles: number;
  /**
   * A preprocessor function can be declared by syntax.
   */
  preprocessors: Preprocessors;

  /**
   * An importer is an object that is in charge of findi
   *
   */
  importer: Importer;

  importerData: ImporterData;
  /**
   * If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were preprocessed for another syntax.
   * this can be disabled by setting `disablePreprocessChaining` to true.
   */
  disablePreprocessChaining: boolean;
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export type Options = Partial<Readonly<Configuration>>;

/**
 * Options that can/will be read but not changed. Default
 * values will have already been provided.
 */
export type ResolvedConfiguration = Readonly<Configuration>;

export type ConfigurationObjectKeys = "importerData"
                                    | "preprocessors";
export type ConfigurationSimpleKeys = "outputMode"
                                    | "importer"
                                    | "rootDir"
                                    | "disablePreprocessChaining"
                                    | "maxConcurrentCompiles";
