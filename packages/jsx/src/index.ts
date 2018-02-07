import * as fs from 'fs';
import * as path from 'path';

import traverse from 'babel-traverse';
import * as babylon from 'babylon';
import {
  Block,
  BlockFactory,
  MultiTemplateAnalyzer,
  PluginOptions as CssBlocksOptions,
  PluginOptionsReader as CssBlocksOptionsReader
} from 'css-blocks';
import * as typescript from 'typescript';

import { analyzer } from './analyzer';
import { importer } from './importer';
import { CSSBlocksJSXTransformer } from './transformer';
import { Analysis, JSXTemplate, MetaAnalysis } from './utils/Analysis';
import { JSXParseError } from './utils/Errors';

function readFile(filename: string, encoding: string): Promise<string>;
function readFile(filename: string, encoding: null): Promise<Buffer>;
function readFile(filename: string): Promise<Buffer>;
function readFile(filename: string, encoding?: string | null): Promise<string | Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, encoding || null, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Default parser options.
 */

export interface JSXAnalyzerOptions {
   baseDir: string;
   parserOptions?: object;
   aliases?: { [alias: string]: string };
   compilationOptions?: CssBlocksOptions;
 }

const defaultOptions: JSXAnalyzerOptions = {
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
  },
  aliases: {}
};

export function parseWith(template: JSXTemplate, metaAnalysis: MetaAnalysis, factory: BlockFactory, opts: Partial<JSXAnalyzerOptions> = {}): Promise<Analysis> {
  let resolvedOpts = {...defaultOptions, ...opts};

  // Change our process working directory so relative node resolves work.
  let oldDir = process.cwd();
  process.chdir(resolvedOpts.baseDir);

  let analysis: Analysis = new Analysis(template, metaAnalysis);

  // Parse the file into an AST.
  try {

    // Babylon currently has...abysmal support for typescript. We need to transpile
    // it with the standard typescript library first.
    // TODO: When Typescript support lands in Babylon, remove this: https://github.com/babel/babylon/issues/320
    if (path.parse(template.identifier).ext === '.tsx') {
      let wat = typescript.transpileModule(template.data, {
        compilerOptions: {
          module: typescript.ModuleKind.ES2015,
          jsx: typescript.JsxEmit.Preserve,
          target: typescript.ScriptTarget.Latest
        }
      });
      template.data = wat.outputText;
    }

    analysis.template.ast = babylon.parse(template.data, resolvedOpts.parserOptions);
  } catch (e) {
    process.chdir(oldDir);
    throw new JSXParseError(`Error parsing '${template.identifier}'\n${e.message}\n\n${template.data}: ${e.message}`, { filename: template.identifier });
  }

  // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
  // for each CSS Blocks import it encounters.
  traverse(analysis.template.ast, importer(template, analysis, factory, resolvedOpts));

  // Once all blocks this file is waiting for resolve, resolve with the File object.
  let analysisPromise = Promise.all(analysis.blockPromises)
  .then((blocks: Block[]) => {
    return analysis;
  });

  // After import traversal, it is safe to move back to our old working directory.
  process.chdir(oldDir);

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
export function parseFileWith(file: string, metaAnalysis: MetaAnalysis, factory: BlockFactory, opts: Partial<JSXAnalyzerOptions> = {}): Promise<Analysis> {
  let resolvedOpts = {...defaultOptions, ...opts};
  file = path.resolve(resolvedOpts.baseDir, file);

  return readFile(file, 'utf8')
    .then(data =>{
            // Return promise for parsed analysis object.
            let template: JSXTemplate = new JSXTemplate(file, data);
            return parseWith(template, metaAnalysis, factory,resolvedOpts);
          },
          (err) => {
            throw new JSXParseError(`Cannot read JSX entry point file ${file}: ${err.message}`, { filename: file });
          });
}

/**
 * Provided a code string, return a promise for the fully parsed analytics object.
 * @param data The code string to parse.
 * @param opts Optional analytics parser options.
 */
export function parse(filename: string, data: string, factory: BlockFactory, opts: Partial<JSXAnalyzerOptions> = {}): Promise<MetaAnalysis> {
  let resolvedOpts = {...defaultOptions, ...opts};

  let template: JSXTemplate = new JSXTemplate(filename, data);
  let metaAnalysis: MetaAnalysis = new MetaAnalysis();

  return Promise.resolve().then(() => {
    return parseWith(template, metaAnalysis, factory, resolvedOpts).then(analysis => {
      return resolveAllRecursively(metaAnalysis.analysisPromises).then((analyses) => {
        for (let analysis of (new Set(analyses))) {
          traverse(analysis.template.ast, analyzer(analysis));
          metaAnalysis.addAnalysis(analysis);
          // No need to keep detailed template data anymore!
          delete analysis.template.ast;
          delete analysis.template.data;
        }
        return metaAnalysis;
      });
    });
  });
}

function resolveAllRecursively<T>(promiseArray: Array<Promise<T>>): Promise<Array<T>> {
  return new Promise<Array<T>>((resolve, reject) => {
    let currentLength = promiseArray.length;
    let waitAgain = (promise: Promise<Array<T>>): void => {
      promise.then((values) => {
                     if (promiseArray.length === currentLength) {
                       resolve(values);
                     } else {
                       currentLength = promiseArray.length;
                       waitAgain(Promise.all(promiseArray));
                     }
                   },
                   (error) => {
                     reject(error);
                   });
    };
    waitAgain(Promise.all(promiseArray));
  });
}

/**
 * Provided a file path, return a promise for the fully parsed analytics object.
 * // TODO: Make streaming?
 * @param file The file path to read in and parse.
 * @param opts Optional analytics parser options.
 */
export function parseFile(file: string, factory: BlockFactory, opts: Partial<JSXAnalyzerOptions> = {}): Promise<MetaAnalysis> {
  let resolvedOpts = {...defaultOptions, ...opts};

  return readFile(path.resolve(resolvedOpts.baseDir, file), 'utf8')
    .then(data => {
            return parse(file, data, factory, resolvedOpts);
          },
          err => {
            throw new JSXParseError(`Cannot read JSX entry point file ${file}: ${err.message}`, { filename: file });
          });
}

export class CSSBlocksJSXAnalyzer implements MultiTemplateAnalyzer {
  private _blockFactory: BlockFactory;
  private entryPoint: string;
  private name: string;
  private options: JSXAnalyzerOptions;
  private cssBlocksOptions: CssBlocksOptionsReader;

  constructor(entryPoint: string, name: string, options: JSXAnalyzerOptions){
    this.entryPoint = entryPoint;
    this.name = name;
    this.options = options;
    this.cssBlocksOptions = new CssBlocksOptionsReader(options.compilationOptions || {});
    this._blockFactory = this.cssBlocksOptions.factory || new BlockFactory(this.cssBlocksOptions);
  }
  analyze(): Promise<MetaAnalysis> {
    if (!this.entryPoint || !this.name) {
      throw new JSXParseError('CSS Blocks JSX Analyzer must be passed an entry point and name.');
    }
    return parseFile(this.entryPoint, this.blockFactory, this.options);
  }

  reset() {
    this._blockFactory.reset();
  }

  get blockFactory() {
    return this._blockFactory;
  }
}

// tslint:disable-next-line:no-default-export
export default {
  Analyzer: CSSBlocksJSXAnalyzer,
  Rewriter: CSSBlocksJSXTransformer
};
