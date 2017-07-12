import * as babylon from 'babylon';
import * as typescript from 'typescript';
import traverse from 'babel-traverse';

import importer from './importer';
import analyzer from './analyzer';
import CSSBlocksJSXTransformer from './transformer';
import Analysis, { Template, MetaAnalysis } from './utils/Analysis';
import { Block, MultiTemplateAnalyzer } from 'css-blocks';

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
      'flow',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'dynamicImport'
    ]
  }
};

export function parseWith(template: Template, metaAnalysis: MetaAnalysis, opts: ParserOptions = defaultOptions): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // Change our process working directory so relative node resolves work.
  let oldDir = process.cwd();
  process.chdir(opts.baseDir);

  let analysis: Analysis = new Analysis(template, metaAnalysis);

  // Parse the file into an AST.
  try {

    // Babylon currently has...abysmal support for typescript. We need to transpile
    // it with the standard typescript library first.
    // TODO: When Typescript support lands in Babylon, remove this: https://github.com/babel/babylon/issues/320
    if ( path.parse(template.identifier).ext === '.tsx') {
      let wat = typescript.transpileModule(template.data, {
        compilerOptions: {
          module: typescript.ModuleKind.ES2015,
          jsx: typescript.JsxEmit.Preserve,
          target: typescript.ScriptTarget.Latest
        }
      });
      template.data = wat.outputText;
    }

    analysis.template.ast = babylon.parse(template.data, opts.parserOptions);
  } catch (e) {
    throw new Error(`Error parsing '${template.identifier}'\n${e.message}\n\n${template.data}.`);
  }

  // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
  // for each CSS Blocks import it encounters.
  traverse(analysis.template.ast, importer(template, analysis));

  // After import traversal, it is save to move back to our old working directory.
  process.chdir(oldDir);

  // Once all blocks this file is waiting for resolve, resolve with the File object.
  let analysisPromise = Promise.resolve()
  .then(() => {
    return Promise.all(analysis.blockPromises);
  })
  .then((blocks: Block[]) => {
    return analysis;
  });

  // Add this file promise to the list of dependents waiting to resolve.
  metaAnalysis.analysisPromises.push(analysisPromise);
  return analysisPromise;

}

/**
 * Provided a file path, return a promise for the parsed Template object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFileWith(file: string, metaAnalysis: MetaAnalysis, opts: ParserOptions = defaultOptions): Promise<Analysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file && !path.isAbsolute(file) ) {
    file = path.resolve(opts.baseDir, file);
  }

  // Fetch file contents from the now absolute path.
  let data: string;
  try {
    data = <string>fs.readFileSync(<string>file, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read JSX entrypoint file ${file}`);
  }

  // Return promise for parsed analysis object.
  let template: Template = new Template(file, data);

  return parseWith(template, metaAnalysis, opts);
}
/**
 * Provided a code string, return a promise for the fully parsed analytics object.
 * @param data The code string to parse.
 * @param opts Optional analytics parser options.
 */
export function parse(data: string, opts: ParserOptions = defaultOptions): Promise<MetaAnalysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  let template: Template = new Template('', data);
  let metaAnalysis: MetaAnalysis = new MetaAnalysis();

  return Promise.resolve().then(() => {
    parseWith(template, metaAnalysis, opts);
    return Promise.all(metaAnalysis.analysisPromises).then((analyses: Analysis[]) => {
      analyses.forEach((analysis: Analysis) => {
        traverse(analysis.template.ast, analyzer(analysis));
        metaAnalysis.addAnalysis(analysis);
      });
      return metaAnalysis;
    });
  });
}

/**
 * Provided a file path, return a promise for the fully parsed analytics object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFile(file: string, opts: ParserOptions = defaultOptions): Promise<MetaAnalysis> {

  // Ensure default options.
  opts = Object.assign({}, defaultOptions, opts);

  // If requesting the file at a relative path, resolve to provided `opts.baseDir`.
  if ( file && !path.isAbsolute(file) ) {
    file = path.resolve(opts.baseDir, file);
  }

  // Fetch file contents from the now absolute path.
  let data: string;
  try {
    data = <string>fs.readFileSync(<string>file, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read JSX entrypoint file ${file}`);
  }

  // Return promise for parsed analysis object.
  let template: Template = new Template(file, data);
  let metaAnalysis: MetaAnalysis = new MetaAnalysis();

  return Promise.resolve().then(() => {
    parseWith(template, metaAnalysis, opts);
    return Promise.all(metaAnalysis.analysisPromises).then((analyses: Analysis[]) => {
      analyses.forEach((analysis: Analysis) => {
        traverse(analysis.template.ast, analyzer(analysis));
        metaAnalysis.addAnalysis(analysis);
      });
      return metaAnalysis;
    });
  });
}

export class CSSBlocksJSXAnalyzer implements MultiTemplateAnalyzer<Template> {
  private entrypoint: string;
  private name: string;

  constructor(entrypoint: string, name: string){
    this.entrypoint = entrypoint;
    this.name = name;
  }
  analyze(): Promise<MetaAnalysis> {
    if ( !this.entrypoint || !this.name ) {
      throw new Error('CSS Blocks JSX Analyzer must be passed an entrypoint and name.');
    }
    return parseFile(this.entrypoint);
  }
  reset()  : Promise<MetaAnalysis> { return parseFile(''); }
}

export default {
  Analyzer: CSSBlocksJSXAnalyzer,
  Rewriter: CSSBlocksJSXTransformer,
};
