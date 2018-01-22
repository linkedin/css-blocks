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
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export type PluginOptions = Partial<Readonly<CssBlockOptions>>;

export type CssBlockOptionsReadonly = Readonly<CssBlockOptions>;
