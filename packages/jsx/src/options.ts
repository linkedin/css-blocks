import { ObjectDictionary } from "@opticss/util";
import {
  ResolvedConfiguration as CSSBlocksConfiguration,
  resolveConfiguration as resolveBlocksOptions,
} from "css-blocks";

/**
 * Default parser options.
 */
const DEFAULT_PARSER_OPTS: object = {
  sourceType: "module",
  plugins: [
    "jsx",
    "flow",
    "decorators",
    "classProperties",
    "exportExtensions",
    "asyncGenerators",
    "functionBind",
    "functionSent",
    "dynamicImport",
  ],
};

export class CssBlocksJSXOptions {
  public baseDir: string;
  public parserOptions: object;
  public aliases: ObjectDictionary<string>;
  public compilationOptions: CSSBlocksConfiguration;

  constructor(opts: Partial<CssBlocksJSXOptions>) {
    this.baseDir = opts.baseDir || ".";
    this.parserOptions = opts.parserOptions || DEFAULT_PARSER_OPTS;
    this.aliases = opts.aliases || {};
    this.compilationOptions = resolveBlocksOptions(opts.compilationOptions);
  }
}
