import { Preprocessors } from "./BlockParser";
import { OutputMode } from "./OutputMode";

/**
 * Options used by css-blocks for compilation and analysis.
 */
export interface CssBlockOptions {
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
export type PluginOptions = Partial<Readonly<CssBlockOptions>>;

export type CssBlockOptionsReadonly = Readonly<CssBlockOptions>;
