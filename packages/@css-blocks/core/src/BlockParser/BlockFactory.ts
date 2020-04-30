import { ObjectDictionary, isString } from "@opticss/util";
import * as debugGenerator from "debug";
import { LegacyRawSourceMap, adaptFromLegacySourceMap, postcss } from "opticss";
import * as path from "path";
import { RawSourceMap } from "source-map";

import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { FileIdentifier, ImportedFile, Importer } from "../importing";
import { PromiseQueue } from "../util/PromiseQueue";

import { BlockParser, ParsedSource } from "./BlockParser";
import { Preprocessor, Preprocessors, ProcessedFile, Syntax, annotateCssContentWithSourceMap, syntaxName } from "./preprocessing";

const debug = debugGenerator("css-blocks:BlockFactory");

interface PreprocessJob {
  preprocessor: Preprocessor;
  filename: string;
  contents: string;
}

interface ErrorWithErrNum {
  code?: string;
  message: string;
}

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * This also ensures that importers and preprocessors are correctly used when loading a block file.
 */
export class BlockFactory {
  postcssImpl: typeof postcss;
  importer: Importer;
  configuration: ResolvedConfiguration;
  blockNames: ObjectDictionary<number>;
  parser: BlockParser;
  preprocessors: Preprocessors;
  faultTolerant: boolean;

  private promises: ObjectDictionary<Promise<Block>>;
  private blocks: ObjectDictionary<Block>;
  private paths: ObjectDictionary<string>;
  private preprocessQueue: PromiseQueue<PreprocessJob, ProcessedFile>;

  constructor(options: Options, postcssImpl = postcss, faultTolerant = false) {
    this.postcssImpl = postcssImpl;
    this.configuration = resolveConfiguration(options);
    this.importer = this.configuration.importer;
    this.preprocessors = this.configuration.preprocessors;
    this.parser = new BlockParser(options, this);
    this.blocks = {};
    this.blockNames = {};
    this.promises = {};
    this.paths = {};
    this.preprocessQueue = new PromiseQueue(this.configuration.maxConcurrentCompiles, (item: PreprocessJob) => {
      return item.preprocessor(item.filename, item.contents, this.configuration);
    });
    this.faultTolerant = faultTolerant;
  }

  /**
   * Toss out any caches in this BlockFactory. Any future requests for a block
   * or block path will be loaded fresh from persistent storage.
   */
  reset() {
    this.blocks = {};
    this.paths = {};
    this.promises = {};
    this.blockNames = {};
  }

  /**
   * Parse a `postcss.Root` into a Block object. Save the Block promise and
   * return it. Use parseRoot if we need to catch errors.
   *
   * This function is referenced only in tests.
   * @param root The postcss.Root to parse.
   * @param identifier A unique identifier for this Block file.
   * @param name Default name for the block.
   * @returns The Block object promise.
   */
  parseRootFaultTolerant(root: postcss.Root, identifier: string, name: string): Promise<Block> {
    return this.promises[identifier] = this.parser.parse(root, identifier, name);
  }

  /**
   * Parse a `postcss.Root` into a Block object. Save the Block promise and return it.
   * Also assert that the block is valid so that we can catch any errors that
   * the block contains.
   *
   * This function is only used in tests
   * @param root The postcss.Root to parse.
   * @param identifier A unique identifier for this Block file.
   * @param name Default name for the block.
   * @returns The Block object promise.
   */
  async parseRoot(root: postcss.Root, identifier: string, name: string): Promise<Block> {
    const block = await this.parseRootFaultTolerant(root, identifier, name);
    return this._surfaceBlockErrors(block);
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

  /**
   * Given a file path (or other data path reference), load data from storage and parse it
   * into a CSS Block.
   *
   * @param filePath - The path to the file or data in persistent storage. The Importer that you've
   *                   configured to use will resolve this to a location in the storage system.
   * @returns A promise that resolves to the parsed block.
   */
  getBlockFromPath(filePath: string): Promise<Block> {
    if (!path.isAbsolute(filePath)) {
      throw new Error(`An absolute path is required. Got: ${filePath}.`);
    }
    filePath = path.resolve(filePath);

    let identifier: FileIdentifier = this.paths[filePath] || this.importer.identifier(null, filePath, this.configuration);
    return this.getBlock(identifier);
  }

  /**
   * Given a FileIdentifier that points to block data on storage, load the data and parse it
   * into a CSS Block. In most cases, you'll likely want to use getBlockFromPath() instead.
   *
   * If the block for the given identifier has already been loaded and parsed,
   * the cached data will be returned instead. If loading and parsing is already in progress,
   * the existing promise for that identifier will be returned.
   *
   * @param identifier - An identifier that points at a data file or blob in persistent storage.
   *                     These identifiers are created by the Importer that you've configured
   *                     to use.
   * @returns A promise that resolves to the parsed block.
   */
  getBlock(identifier: FileIdentifier): Promise<Block> {
    if (this.blocks[identifier]) {
      return Promise.resolve(this.blocks[identifier]);
    } else if (this.promises[identifier]) {
      return this.promises[identifier].catch(() => {
        // If we got an error last time, try again.
        // Also this makes sure that the error object gives a correct import stack trace.
        return this._getBlockPromise(identifier);
      });
    }
    return this._getBlockPromise(identifier);
  }

  /**
   * Make a promise to load and parse a CSS Block data file, add it to the cache,
   * and return it.
   *
   * @param identifier - An identifier that points at a data file or blob in persistent storage.
   * @returns A promise that resolves to the parsed block.
   */
  private _getBlockPromise(identifier: FileIdentifier): Promise<Block> {
    return this.promises[identifier] = this._getBlockPromiseAsync(identifier);
  }

  /**
   * An async method that loads and parses a CSS Block data file. We load the data here, using
   * the Importer, then defer to another method to actually parse the data file into a Block.
   *
   * @param identifier - An identifier that points at a data file or blob in persistent storage.
   * @returns A promise that resolves to the parsed block.
   */
  private async _getBlockPromiseAsync(identifier: FileIdentifier): Promise<Block> {
    try {
      let file = await this.importer.import(identifier, this.configuration);
      let block = await this._importAndPreprocessBlock(file);
      debug(`Finalizing Block object for "${block.identifier}"`);

      // last check to make sure we don't return a new instance
      if (this.blocks[block.identifier]) {
        return this.blocks[block.identifier];
      }

      // Ensure this block name is unique.
      block.setName(this.getUniqueBlockName(block.name));

      // if the block has any errors, surface them here unless we're in fault tolerant mode.
      this._surfaceBlockErrors(block);
      this.blocks[block.identifier] = block;
      return block;
    } catch (error) {
      if (this.preprocessQueue.activeJobCount > 0) {
        debug(`Block error. Currently there are ${this.preprocessQueue.activeJobCount} preprocessing jobs. waiting.`);
        await this.preprocessQueue.drain();
        debug(`Drain complete. Raising error.`);
        throw error;
      } else {
        debug(`Block error. There are no preprocessing jobs. raising.`);
        throw error;
      }
    }
  }

  /**
   * Depending on whether the blockFactory is fault tolerant or not, it either
   * surfaces the errors or swallows them and reexports the block interface
   * @param block the block to check for errors
   */
  private _surfaceBlockErrors(block: Block): Block {
    if (this.faultTolerant) {
      return block;
    } else {
      return block.assertValid();
    }
  }

  /**
   * Parse the file into a `Block`. Specifically, this method runs the data through any related
   * preprocessor (such as a SASS or LESS compiler), parses the CSS into an AST using PostCSS, then
   * hands the AST off to the Block parser to validate the CSS and transform it into the Block
   * class used by CSS Blocks.
   *
   * Notably, this method expects that any related file data has already been loaded from memory
   * using the Importer.
   *
   * @param file - The file information that has been previously imported by the Importer, for
   *               a single block identifier. Can be an ImportedFile (for standard block files)
   *               or CompiledImportedFile (a paired compiled CSS file and its related
   *               block definition file).
   * @returns A promise that resolves to a parsed block.
   **/
  private async _importAndPreprocessBlock(file: ImportedFile): Promise<Block> {
    // If the file identifier maps back to a real filename, ensure it is actually unique.
    let realFilename = this.importer.filesystemPath(file.identifier, this.configuration);
    if (realFilename) {
      if (this.paths[realFilename] && this.paths[realFilename] !== file.identifier) {
        throw new Error(`The same block file was returned with different identifiers: ${this.paths[realFilename]} and ${file.identifier}`);
      } else {
        this.paths[realFilename] = file.identifier;
      }
    }

    // Skip preprocessing if we can.
    if (this.blocks[file.identifier]) {
      debug(`Using pre-compiled Block for "${file.identifier}"`);
      return this.blocks[file.identifier];
    }

    // Preprocess the file.
    let filename: string = realFilename || this.importer.debugIdentifier(file.identifier, this.configuration);
    let preprocessor = this.preprocessor(file);

    debug(`Preprocessing "${filename}"`);
    let preprocessResult = await this.preprocessQueue.enqueue({
      preprocessor,
      filename,
      contents: file.contents,
    });

    debug(`Generating PostCSS AST for "${filename}"`);
    let sourceMap = sourceMapFromProcessedFile(preprocessResult);
    let content = preprocessResult.content;
    if (sourceMap) {
      content = annotateCssContentWithSourceMap(this.configuration, filename, content, sourceMap);
    }
    let root = await this.postcssImpl.parse(content, { from: filename });

    // Skip parsing if we can.
    if (this.blocks[file.identifier]) {
      return this.blocks[file.identifier];
    }
    debug(`Parsing Block object for "${filename}"`);
    let source: ParsedSource = {
      identifier: file.identifier,
      defaultName: file.defaultName,
      parseResult: root,
      originalSource: file.contents,
      originalSyntax: file.syntax,
      dependencies: preprocessResult.dependencies || [],
    };

    return this.parser.parseSource(source);
  }

  /**
   * Similar to getBlockFromPath(), this imports and parses a block data file. However,
   * this method can accept relative paths using a FileIdentifier (generated by an Importer)
   * as the base location for the relative path.
   *
   * @param fromIdentifier - The FileIdentifier that references the base location that the
   *                         import path is relative to.
   * @param importPath - The relative import path for the file to import.
   * @returns A promise that resolves to a parsed block.
   */
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block> {
    let importer = this.importer;
    let fromPath = importer.debugIdentifier(fromIdentifier, this.configuration);
    let identifier = importer.identifier(fromIdentifier, importPath, this.configuration);
    return this.getBlock(identifier).catch((err: ErrorWithErrNum) => {
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
  getUniqueBlockName(name: string): string {
    if (!this.blockNames[name]) {
      this.blockNames[name] = 1;
      return name;
    }
    return `${name}-${++this.blockNames[name]}`;
  }

  preprocessor(file: ImportedFile): Preprocessor {
    let syntax = file.syntax;
    let firstPreprocessor: Preprocessor | undefined = this.preprocessors[syntax];
    let preprocessor: Preprocessor | null = null;
    if (firstPreprocessor) {
      if (syntax !== Syntax.css && this.preprocessors.css && !this.configuration.disablePreprocessChaining) {
        let cssProcessor = this.preprocessors.css;
        preprocessor = (fullPath: string, content: string, configuration: ResolvedConfiguration): Promise<ProcessedFile> => {
          return firstPreprocessor!(fullPath, content, configuration).then(result => {
            let content = result.content.toString();
            return cssProcessor(fullPath, content, configuration, sourceMapFromProcessedFile(result)).then(result2 => {
              return {
                content: result2.content,
                sourceMap: sourceMapFromProcessedFile(result2),
                dependencies: (result.dependencies || []).concat(result2.dependencies || []),
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
      preprocessor = (_fullPath: string, content: string, _options: ResolvedConfiguration): Promise<ProcessedFile> => {
        return Promise.resolve({
          content: content,
        });
      };

    }
    return preprocessor;
  }
}

function sourceMapFromProcessedFile(result: ProcessedFile): RawSourceMap | string | undefined {
  let sourceMap: LegacyRawSourceMap | RawSourceMap | string | undefined = result.sourceMap;
  if (!sourceMap && !isString(result.content) && result.content.map) {
    sourceMap = result.content.map.toJSON();
  }
  if (typeof sourceMap === "object") {
    return adaptFromLegacySourceMap(sourceMap);
  } else {
    return sourceMap;
  }
}
