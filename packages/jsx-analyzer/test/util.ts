import { parse, parseFile, JSXAnalyzerOptions } from '../src/index';
import { BlockFactory, PluginOptionsReader as CssBlocksOptionsReader, PluginOptions as CssBlocksOptions } from 'css-blocks';
import { MetaAnalysis } from '../src/utils/Analysis';

export function testParse(data: string, opts?: JSXAnalyzerOptions, cssBlocksOpts?: CssBlocksOptions): Promise<MetaAnalysis> {
   let defaultOpts = new CssBlocksOptionsReader(cssBlocksOpts);
   let factory = new BlockFactory(defaultOpts);
   return parse(data, factory, opts);
}

export function testParseFile(file: string, opts?: JSXAnalyzerOptions, cssBlocksOpts?: CssBlocksOptions): Promise<MetaAnalysis> {
   let defaultOpts = new CssBlocksOptionsReader(cssBlocksOpts);
   let factory = new BlockFactory(defaultOpts);
   return parseFile(file, factory, opts);
}
