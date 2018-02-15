import { BlockFactory, PluginOptions as CssBlocksOptions, PluginOptionsReader as CssBlocksOptionsReader } from "css-blocks";

import { JSXAnalyzerOptions, parse, parseFile } from "../src/index";
import { MetaAnalysis } from "../src/utils/Analysis";

export function testParse(data: string, filename = "", opts?: JSXAnalyzerOptions, cssBlocksOpts?: CssBlocksOptions): Promise<MetaAnalysis> {
   let defaultOpts = new CssBlocksOptionsReader(cssBlocksOpts);
   let factory = new BlockFactory(defaultOpts);
   return parse(filename, data, factory, opts);
}

export function testParseFile(file: string, opts?: JSXAnalyzerOptions, cssBlocksOpts?: CssBlocksOptions): Promise<MetaAnalysis> {
   let defaultOpts = new CssBlocksOptionsReader(cssBlocksOpts);
   let factory = new BlockFactory(defaultOpts);
   return parseFile(file, factory, opts);
}
