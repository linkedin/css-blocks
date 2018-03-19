import { Preprocessors } from "./BlockParser";
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
   * If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were preprocessed for another syntax.
   * this can be disabled by setting `disablePreprocessChaining` to true.
   */
  disablePreprocessChaining: boolean;
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export type SparseOptions = Partial<Readonly<Options>>;

/**
 * Options that can/will be read but not changed. Default
 * values will have already been provided.
 */
export type ReadonlyOptions = Readonly<Options>;
