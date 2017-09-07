import * as postcss from "postcss";
import * as path from "path";
import * as debugGenerator from "debug";
import { Block } from "./Block";
import { IBlockFactory } from "./IBlockFactory";
import BlockParser, { ParsedSource } from "../BlockParser";
import { PluginOptions, CssBlockOptionsReadonly } from "../options";
import { OptionsReader } from "../OptionsReader";
import { Importer, FileIdentifier, ImportedFile } from "../importing";
import { annotateCssContentWithSourceMap, Preprocessors, Preprocessor, ProcessedFile, Syntax, syntaxName } from "../preprocessing";
import { RawSourceMap } from "source-map";
import { PromiseQueue } from "../util/PromiseQueue";

const debug = debugGenerator("css-blocks:BlockFactory");

declare module "../options" {
  export interface CssBlockOptions {
    /**
     * Depending on how css blocks are compiled, it may be necessary for a factory to be provided to the options
     * to ensure that instances are reused for compilation. Failing to do this can cause static analysis errors.
     */
    factory?: BlockFactory;
  }
}

interface PreprocessJob {
  preprocessor: Preprocessor;
  filename: string;
  contents: string;
}

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * This also ensures that importers and preprocessors are correctly used when loading a block file.
 */
export class BlockFactory implements IBlockFactory {
  postcssImpl: typeof postcss;
  importer: Importer;
  options: CssBlockOptionsReadonly;
  blockNames: {[name: string]: number};
  parser: BlockParser;
  preprocessors: Preprocessors;
  private promises: {
    [identifier: string]: Promise<Block>
  };
  private blocks: {
    [identifier: string]: Block
  };
  private paths: {
    [path: string]: string;
  };

  private preprocessQueue: PromiseQueue<PreprocessJob, ProcessedFile>;

  constructor(options: PluginOptions, postcssImpl = postcss) {
    this.postcssImpl = postcssImpl;
    this.options = new OptionsReader(options);
    this.importer = this.options.importer;
    this.preprocessors = this.options.preprocessors;
    this.parser = new BlockParser(this.postcssImpl, options, this);
    this.blocks = {};
    this.blockNames = {};
    this.promises = {};
    this.paths = {};
    this.preprocessQueue = new PromiseQueue(this.options.maxConcurrentCompiles, (item: PreprocessJob) => {
      return item.preprocessor(item.filename, item.contents, this.options);
    });
  }
  reset() {
    this.blocks = {};
    this.paths = {};
    this.promises = {};
    this.blockNames = {};
  }
  /**
   * In some cases (like when using preprocessors with native bindings), it may
   * be necessary to wait until the block factory has completed current
   * asynchronous work before exiting. Calling this method stops new pending
   * work from being performed and returns a promise that resolves when it is
   * safe to exit.
   */
  prepareForExit(): Promise<void> {
    if (this.preprocessQueue.activeJobCount > 0) {
      return this.preprocessQueue.drain();
    } else {
      return Promise.resolve();
    }
  }
  getBlockFromPath(filePath: string): Promise<Block> {
    if (!path.isAbsolute(filePath)) {
      throw new Error(`An absolute path is required. Got: ${filePath}.`);
    }
    filePath = path.resolve(filePath);
    let identifier: FileIdentifier | undefined = this.paths[filePath];
    if (identifier && this.promises[identifier]) {
      return this.promises[identifier];
    } else {
      identifier = identifier || this.importer.identifier(null, filePath, this.options);
      return this._getBlockPromise(identifier);
    }
  }
  getBlock(identifier: FileIdentifier): Promise<Block> {
    if (this.promises[identifier]) {
      return this.promises[identifier];
    } else {
      return this._getBlockPromise(identifier);
    }
  }
  _getBlockPromise(identifier: FileIdentifier): Promise<Block> {
    let importPromise = this.importer.import(identifier, this.options);
    let blockPromise = importPromise.then(file => {
      let realFilename = this.importer.filesystemPath(file.identifier, this.options);
      if (realFilename) {
        if (this.paths[realFilename]) {
          if (this.paths[realFilename] !== file.identifier) {
            throw new Error(`The same block file was returned with different identifiers: ${this.paths[realFilename]} and ${file.identifier}`);
          }
        } else {
          this.paths[realFilename] = file.identifier;
        }
        if (!this.promises[file.identifier]) {
          this.promises[file.identifier] = blockPromise;
        }
      }
      // skip preprocessing if we can.
      if (this.blocks[file.identifier]) {
        return this.blocks[file.identifier];
      }
      let filename: string = realFilename || this.importer.debugIdentifier(file.identifier, this.options);
      let preprocessor = this.preprocessor(file);
      let preprocessPromise = this.preprocessQueue.enqueue({
        preprocessor,
        filename,
        contents: file.contents,
      });
      let resultPromise: Promise<[ProcessedFile, postcss.Result]> = preprocessPromise.then(preprocessResult => {
        let sourceMap = sourceMapFromProcessedFile(preprocessResult);
        let content = preprocessResult.content;
        if (sourceMap) {
          content = annotateCssContentWithSourceMap(content, sourceMap);
        }
        return new Promise<postcss.Result>((resolve, reject) => {
          this.postcssImpl().process(content, { from: filename }).then(resolve, reject);
        }).then(result => {
          let res: [ProcessedFile, postcss.Result] = [preprocessResult, result];
          return res;
        });
      });
      return resultPromise.then(([preprocessedResult, result]) => {
        // skip parsing if we can.
        if (this.blocks[file.identifier]) {
          return this.blocks[file.identifier];
        }
        let source: ParsedSource = {
          identifier: file.identifier,
          defaultName: file.defaultName,
          parseResult: result,
          originalSource: file.contents,
          originalSyntax: file.syntax,
          dependencies: preprocessedResult.dependencies || []
        };
        return this.parser.parseSource(source).then(block => {
          return block;
        });
      });
    }).then(block => {
      // last check  to make sure we don't return a new instance
      if (this.blocks[block.identifier]) {
        return this.blocks[block.identifier];
      } else {
        return block;
      }
    }).catch((error) => {
      if (this.preprocessQueue.activeJobCount > 0) {
        debug(`Block error. Currently there are ${this.preprocessQueue.activeJobCount} preprocessing jobs. waiting.`);
        return this.preprocessQueue.drain().then(() => {
          debug(`Drain complete. Raising error.`);
          throw error;
        });
      } else {
        debug(`Block error. There are no preprocessing jobs. raising.`);
        throw error;
      }
    });
    this.promises[identifier] = blockPromise;
    return blockPromise;
  }
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block> {
    let importer = this.importer;
    let fromPath = importer.debugIdentifier(fromIdentifier, this.options);
    let identifier = importer.identifier(fromIdentifier, importPath, this.options);
    return this.getBlock(identifier).catch(err => {
      if (err.code === "ENOENT") {
        err.message = `From ${fromPath}: ${err.message}`;
      }
      throw err;
    });
  }

  /**
   * Register a new block name with the BlockFactory. Return true true if successful, false if already exists.
   * @param name The new block name to register.
   * @return True or false depending on success status.
   */
  getUniqueBlockName(name: string): string{
    if ( !this.blockNames[name] ) {
      this.blockNames[name] = 1;
      return name;
    }
    return `${name}-${++this.blockNames[name]}`;
  }

  preprocessor(file: ImportedFile): Preprocessor {
    let syntax = file.syntax;
    let firstPreprocessor: Preprocessor = this.preprocessors[syntax];
    let preprocessor: Preprocessor | null = null;
    if (firstPreprocessor) {
      if (syntax !== Syntax.css && this.preprocessors.css && !this.options.disablePreprocessChaining) {
        let cssProcessor = this.preprocessors.css;
        preprocessor = (fullPath: string, content: string, options: CssBlockOptionsReadonly): Promise<ProcessedFile> => {
          return firstPreprocessor(fullPath, content, options).then(result => {
            let content = result.content.toString();
            return cssProcessor(fullPath, content, options, sourceMapFromProcessedFile(result)).then(result2 => {
              return {
                content: result2.content,
                sourceMap: sourceMapFromProcessedFile(result2),
                dependencies: (result.dependencies || []).concat(result2.dependencies || [])
              };
            });
          });
        };
      } else {
        preprocessor = firstPreprocessor;
      }
    } else if (syntax !== Syntax.css) {
      throw new Error(`No preprocessor provided for ${syntaxName(syntax)}.`);
    } else {
      preprocessor = (_fullPath: string, content: string, _options: CssBlockOptionsReadonly): Promise<ProcessedFile> => {
        return Promise.resolve({
          content: content,
        });
      };

    }
    return preprocessor;
  }
}

function sourceMapFromProcessedFile(result: ProcessedFile): RawSourceMap | string | undefined {
  let sourceMap: RawSourceMap | string | undefined = result.sourceMap;
  if (!sourceMap && (<postcss.Result>result.content).map) {
    sourceMap = <RawSourceMap>(<postcss.Result>result.content).map.toJSON();
  }
  return sourceMap;
}
