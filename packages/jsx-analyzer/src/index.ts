import * as babylon from 'babylon';
import traverse from 'babel-traverse';

import importer from './importer';
import analyzer from './analyzer';
import Analysis, { FileContainer } from './utils/Analysis';
import { Block } from 'css-blocks';

const fs = require('fs');
const path = require('path');

/**
 * Requried shape of parser options object.
 */
export interface ParserOptions {
  baseDir: string;
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
      'jsx',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'dynamicImpor'
    ]
  }
};

export function parseWith(template: FileContainer, analysis: Analysis, opts: ParserOptions = defaultOptions): Promise<FileContainer> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // Change our process working directory so relative node resolves work.
  let oldDir = process.cwd();
  process.chdir(opts.baseDir);

  // Parse the file into an AST.
  template.ast = babylon.parse(template.data, opts.parserOptions);

  // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
  // for each CSS Blocks import it encounters.
  traverse(template.ast, importer(template, analysis));

  // After import traversal, it is save to move back to our old working directory.
  process.chdir(oldDir);

  // Once all blocks this file is waiting for resolve, resolve with the File object.
  let filePromise = Promise.resolve()
  .then(() => {
    return Promise.all(template.blockPromises);
  })
  .then((blocks: Block[]) => {
    template.blocks = blocks;
    return template;
  });

  // Add this file promise to the list of dependents waiting to resolve.
  analysis.filePromises.push(filePromise);
  return filePromise;

}

/**
 * Provided a file path, return a promise for the parsed FileContainer object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFileWith(file: string, analysis: Analysis, opts: ParserOptions = defaultOptions): Promise<FileContainer> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file && !path.isAbsolute(file) ) {
    file = path.resolve(opts.baseDir, file);
  }

  // Fetch file contents from the now absolute path.
  let data = <string>fs.readFileSync(<string>file, 'utf8');

  // Return promise for parsed analysis object.
  let template: FileContainer = new FileContainer(file, data);

  return parseWith(template, analysis, opts);
}
/**
 * Provided a code string, return a promise for the fully parsed analytics object.
 * @param data The code string to parse.
 * @param opts Optional analytics parser options.
 */
export function parse(data: string, opts: ParserOptions = defaultOptions): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  let analysis: Analysis = new Analysis({ path: opts.baseDir });
  let template: FileContainer = new FileContainer('', data);

  return Promise.resolve().then(() => {
    parseWith(template, analysis, opts);
    return Promise.all(analysis.filePromises).then((files: FileContainer[]) => {
      analysis.files = files;
      files.forEach((file: FileContainer) => {
        traverse(file.ast, analyzer(file, analysis));
      });
      return analysis;
    });
  });
}

/**
 * Provided a file path, return a promise for the fully parsed analytics object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFile(file: string, opts: ParserOptions = defaultOptions): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file && !path.isAbsolute(file) ) {
    file = path.resolve(opts.baseDir, file);
  }

  // Fetch file contents from the now absolute path.
  let data = <string>fs.readFileSync(<string>file, 'utf8');

  // Return promise for parsed analysis object.
  let template: FileContainer = new FileContainer(file, data);
  let analysis: Analysis      = new Analysis({ path: opts.baseDir });

  return Promise.resolve().then(() => {
    parseWith(template, analysis, opts);
    return Promise.all(analysis.filePromises).then((files: FileContainer[]) => {
      analysis.files = files;
      files.forEach((file: FileContainer) => {
        traverse(file.ast, analyzer(file, analysis));
      });
      return analysis;
    });
  });
}
