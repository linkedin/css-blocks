import * as babylon from 'babylon';
import traverse from 'babel-traverse';

// TODO: Get this StyleAnalysis from `@css-blocks/css-blocks` npm package.
import StyleAnalysis from './StyleAnalysis';

// Babel Visitors
import importer, { ResolvedBlock } from './blockImporter';
import visitors from './visitors';

const fs = require('fs');
const path = require('path');

export interface ResolvedFile {
  string?: string;
  path?: string;
}

export interface ParserOptions {
  baseDir?: string;
}

const defaultOptions: ParserOptions = {
  baseDir: '.'
};

export default function parse(file: ResolvedFile, opts: ParserOptions = {}): Promise<StyleAnalysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If not enough file information has been provided, throw.
  if ( !file.string && !file.path ) {
    throw new Error("Invalid file input to CSS Blocks JSX Analyzer");
  }

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file.path && !path.isAbsolute(file.path) ) {
    file.path = path.resolve(opts.baseDir, file.path);
  }

  // If no file contents provided, fetch from the now absolute path.
  if ( !file.string ) {
    file.string = fs.readFileSync(<string>file.path, 'utf8');
  }

  // Parse the file into an AST.
  let ast = babylon.parse(<string>file.string, {
    sourceType: "module",
    plugins: [
      'estree',
      'jsx',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'dynamicImport'
    ]
  });

  // Create our analysis object
  let analysis: StyleAnalysis = new StyleAnalysis(file);

  // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
  // for each CSS Blocks import it encounters.
  let blocks : Promise<ResolvedBlock>[] = [];
  traverse(ast, importer(blocks));

  // Once all blocks are done being parsed, load them into our analysis object
  // under their local names and begin statically analyzing the remainder of the
  // file. Each visitor has access to the analysis object to make updates.
  return Promise.all(blocks).then((blocks: ResolvedBlock[]) => {
    blocks.forEach((res: ResolvedBlock) => {
      analysis.blocks[res.name] = res.block;
    });
    traverse(ast, visitors(analysis));
    return analysis;
  });

}
