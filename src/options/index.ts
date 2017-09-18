import OutputMode from "./OutputMode";
import TypesMode from "./TypesMode";
import OptionsReader from "./OptionsReader";

/**
 * Options used by css-blocks for compilation and analysis.
 */
export interface CssBlockOptions {
  outputMode: OutputMode;
  interoperableCSS: boolean;
  rootDir: string;
  /**
   * Limits block parsing and compilation to this number at any one time.
   * Defaults to: 4
   */
  maxConcurrentCompiles: number;
  generateTypes: TypesMode;
  typesPath: string;
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export type PluginOptions = Partial<Readonly<CssBlockOptions>>;

export type CssBlockOptionsReadonly = Readonly<CssBlockOptions>;

export {
  OptionsReader,
  OutputMode,
  TypesMode
};
