import { Preprocessors, PreprocessorsSync } from "../BlockParser";
import { Importer, ImporterData } from "../importing";

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
   * A synchronous preprocessor function can be declared by syntax.
   */
  preprocessorsSync: PreprocessorsSync;

  /**
   * An importer is an object that is in charge of finding the contents of a
   * block file from its @block directive
   */
  importer: Importer;

  importerData: ImporterData;
  /**
   * If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were preprocessed for another syntax.
   * this can be disabled by setting `disablePreprocessChaining` to true.
   */
  disablePreprocessChaining: boolean;

  /**
   * Determines the number of significant characters used when generating GUIDs for blocks.
   * These GUIDs are build using a hash based on the file's unique identifier (usually an
   * absolute file path).
   *
   * The default value used is 5 characters. Normally you shouldn't need to change this,
   * but you can increase the number of significant characters in the exceedingly rare event
   * you run into GUID conflicts.
   *
   * This value does not affect GUIDs from pre-compiled blocks imported from other dependencies.
   * In these cases, the Block ID is pre-determined using the GUID value in the block's
   * definition file.
   */
  guidAutogenCharacters: number;
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
                                    | "maxConcurrentCompiles"
                                    | "guidAutogenCharacters";
