import * as postcss from "postcss";
import { Block } from "./Block";
import { IBlockFactory } from "./IBlockFactory";
import BlockParser from "../BlockParser";
import { PluginOptions, CssBlockOptionsReadonly } from "../options";
import { OptionsReader } from "../OptionsReader";
import { Importer, FileIdentifier } from "../importing";
import { annotateCssContentWithSourceMap, Preprocessors, Preprocessor, ProcessedFile, Syntax } from "../preprocessing";
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
  private blocks: {
    [identifier: string]: Promise<Block>
  };
  constructor(options: PluginOptions, postcssImpl = postcss) {
    this.postcssImpl = postcssImpl;
    this.options = new OptionsReader(options);
    this.importer = this.options.importer;
    this.preprocessors = this.options.preprocessors;
    this.parser = new BlockParser(this.postcssImpl, options, this);
    this.blocks = {};
  }
  reset() {
    this.blocks = {};
  }
  getBlock(identifier: FileIdentifier): Promise<Block> {
    if (this.blocks[identifier]) {
      return this.blocks[identifier];
    } else {
      let blockPromise = this.importer.import(identifier, this.options).then(file => {
        let filename: string = this.importer.filesystemPath(identifier, this.options) || this.importer.inspect(identifier, this.options);
        let preprocessor = this.preprocessor(identifier);
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
          if (result.root) {
            return this.parser.parse(result.root, file.identifier, file.defaultName).then(block => {
              return block;
            });
          } else {
            // this doesn't happen but it makes the typechecker happy.
            throw new Error("Missing root");
          }
        });
      });
      this.blocks[identifier] = blockPromise;
      return blockPromise;
    }
  }
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block> {
    let importer = this.importer;
    let identifier = importer.identifier(fromIdentifier, importPath, this.options);
    return this.getBlock(identifier);
  }
  preprocessor(identifier: FileIdentifier): Preprocessor {
    let syntax = this.importer.syntax(identifier, this.options);
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