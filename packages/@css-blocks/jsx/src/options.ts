import { ResolvedConfiguration, resolveConfiguration } from "@css-blocks/core";
import { ObjectDictionary } from "@opticss/util";

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
  public compilationOptions: ResolvedConfiguration;

  constructor(opts: Partial<CssBlocksJSXOptions>) {
    this.baseDir = opts.baseDir || ".";
    this.parserOptions = opts.parserOptions || DEFAULT_PARSER_OPTS;
    this.aliases = opts.aliases || {};
    this.compilationOptions = resolveConfiguration(opts.compilationOptions);
  }
}
