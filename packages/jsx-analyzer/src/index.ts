import * as babylon from 'babylon';
import traverse from 'babel-traverse';

import importer, { ResolvedBlock } from './importer';
import analyzer from './analyzer';
import Analysis from './Analysis';

const fs = require('fs');
const path = require('path');

export interface ParserOptions {
  baseDir?: string;
  parserOptions?: object;
}

/**
 * Default parser options.
 */
const defaultOptions: ParserOptions = {
  baseDir: '.',
  parserOptions: {
    sourceType: 'module',
    plugins: [
      "jsx",
      "decorators",
      "classProperties",
      "exportExtensions",
      "asyncGenerators",
      "functionBind",
      "functionSent",
      "dynamicImport"
    ],
  }
};

/**
 * Provided a code string, return a promise for the fully parsed analytics object.
 * @param data The code string to parse.
 * @param opts Optional analytics parser options.
 */
export function parse(data: string, opts: ParserOptions = {}): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If not enough file information has been provided, throw.
  if ( !data ) {
    throw new Error("Invalid file input to CSS Blocks JSX Analyzer");
  }

  // Parse the file into an AST.
  let ast = babylon.parse(data, {
    sourceType: "module",
    plugins: [
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

  let blocks : Promise<ResolvedBlock>[] = [];
  let analysis: Analysis = new Analysis({ path: '' });

  return Promise.resolve()

  // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
  // for each CSS Blocks import it encounters.
  .then(() => {
    traverse(ast, importer(blocks));
    return Promise.all(blocks);
  })

  // Once all blocks are done being parsed, load them into our analysis object
  // under their local names and begin statically analyzing the remainder of the
  // file. Each visitor has access to the analysis object to make updates.
  .then((blocks: ResolvedBlock[]) => {
    blocks.forEach((res: ResolvedBlock) => {
      analysis.localBlocks[res.localName] = res.block;
      analysis.blocks[res.name] = res.block;
    });
    traverse(ast, analyzer(analysis));
    return analysis;
  });

}


/**
 * Provided a file path, return a promise for the fully parsed analytics object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFile(file: string, opts: ParserOptions = {}): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file && !path.isAbsolute(file) ) {
    file = path.resolve(opts.baseDir, file);
  }

  // Fetch file contents from the now absolute path.
  let data = <string>fs.readFileSync(<string>file, 'utf8');

  // Return promise for parsed analysis object.
  return parse(data, opts);
}
