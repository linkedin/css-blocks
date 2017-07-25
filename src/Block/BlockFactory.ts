import * as postcss from "postcss";
import * as path from "path";
import { Block } from "./Block";
import { IBlockFactory } from "./IBlockFactory";
import BlockParser from "../BlockParser";
import { PluginOptions, CssBlockOptionsReadonly } from "../options";
import { OptionsReader } from "../OptionsReader";
import { Importer, FileIdentifier, ImportedFile } from "../importing";
import { annotateCssContentWithSourceMap, Preprocessors, Preprocessor, ProcessedFile, Syntax, syntaxName } from "../preprocessing";
import { RawSourceMap } from "source-map";

declare module "../options" {
  export interface CssBlockOptions {
    /**
     * Depending on how css blocks are compiled, it may be necessary for a factory to be provided to the options
     * to ensure that instances are reused for compilation. Failing to do this can cause static analysis errors.
     */
    factory?: BlockFactory;
  }
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
  constructor(options: PluginOptions, postcssImpl = postcss) {
    this.postcssImpl = postcssImpl;
    this.options = new OptionsReader(options);
    this.importer = this.options.importer;
    this.preprocessors = this.options.preprocessors;
    this.parser = new BlockParser(this.postcssImpl, options, this);
    this.blocks = {};
    this.promises = {};
    this.paths = {};
  }
  reset() {
    this.blocks = {};
    this.paths = {};
    this.promises = {};
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
      let filename: string = realFilename || this.importer.inspect(file.identifier, this.options);
      let preprocessor = this.preprocessor(file);
      let preprocessPromise = preprocessor(filename, file.contents, this.options);
      let resultPromise = preprocessPromise.then(preprocessResult => {
        let sourceMap = sourceMapFromProcessedFile(preprocessResult);
        let content = preprocessResult.content;
        if (sourceMap) {
          content = annotateCssContentWithSourceMap(content, sourceMap);
        }
        return new Promise<postcss.Result>((resolve, reject) => {
          this.postcssImpl().process(content, { from: filename }).then(resolve, reject);
        });
      });
      return resultPromise.then(result => {
        // skip parsing if we can.
        if (this.blocks[file.identifier]) {
          return this.blocks[file.identifier];
        }
        if (result.root) {
          return this.parser.parse(result.root, file.identifier, file.defaultName).then(block => {
            return block;
          });
        } else {
          // this doesn't happen but it makes the typechecker happy.
          throw new Error("Missing root");
        }
      });
    }).then(block => {
      // last check  to make sure we don't return a new instance
      if (this.blocks[block.identifier]) {
        return this.blocks[block.identifier];
      } else {
        return block;
      }
    });
    this.promises[identifier] = blockPromise;
    return blockPromise;
  }
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block> {
    let importer = this.importer;
    let fromPath = importer.inspect(fromIdentifier, this.options);
    let identifier = importer.identifier(fromIdentifier, importPath, this.options);
    return this.getBlock(identifier).catch(err => {
      if (err.code === "ENOENT") {
        err.message = `From ${fromPath}: ${err.message}`;
      }
      throw err;
    });
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