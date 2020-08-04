import * as config from "@css-blocks/config";
import { AnalysisOptions, NodeJsImporter, Options as ParserOptions, OutputMode } from "@css-blocks/core";
import type { ObjectDictionary } from "@opticss/util";
import type { OptiCSSOptions } from "opticss";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface CSSBlocksEmberOptions {
  output?: string;
  aliases?: ObjectDictionary<string>;
  analysisOpts?: AnalysisOptions;
  parserOpts?: Writeable<ParserOptions>;
  optimization?: Partial<OptiCSSOptions>;
}

export interface ResolvedCSSBlocksEmberOptions {
  output?: string;
  aliases: ObjectDictionary<string>;
  analysisOpts: AnalysisOptions;
  parserOpts: ParserOptions;
  optimization: Partial<OptiCSSOptions>;
}

export function getConfig(root: string, isProduction: boolean, options: CSSBlocksEmberOptions): ResolvedCSSBlocksEmberOptions {
  if (!options.aliases) options.aliases = {};
  if (!options.analysisOpts) options.analysisOpts = {};
  if (!options.optimization) options.optimization = {};

  if (!options.parserOpts) {
    options.parserOpts = config.searchSync(root) || {};
  }

  // Use the node importer by default.
  options.parserOpts.importer = options.parserOpts.importer || new NodeJsImporter(options.aliases);

  if (typeof options.optimization.enabled === "undefined") {
    options.optimization.enabled = isProduction;
  }

  // Update parserOpts to include the absolute path to our application code directory.
  if (!options.parserOpts.rootDir) {
    options.parserOpts.rootDir = root;
  }
  options.parserOpts.outputMode = OutputMode.BEM_UNIQUE;

  if (options.output !== undefined && typeof options.output !== "string") {
    throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Output must be a string. Instead received ${options.output}.`);
  }
  return <ResolvedCSSBlocksEmberOptions>options;
}
