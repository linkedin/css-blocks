import { OutputMode } from "./OutputMode";

/**
 * Options used by css-blocks for compilation and analysis.
 *
 * @export
 * @interface CssBlockOptions
 */
export interface CssBlockOptions {
  outputMode: OutputMode;
  interoperableCSS: boolean;
  rootDir: string;
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export type PluginOptions = Partial<Readonly<CssBlockOptions>>;

export type CssBlockOptionsReadonly = Readonly<CssBlockOptions>;
