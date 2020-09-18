import { ObjectDictionary } from "@opticss/util";
import * as debugGenerator from "debug";
import { postcss } from "opticss";
import * as path from "path";

import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration } from "../configuration";
import { CssBlockError } from "../errors";
import { FileIdentifier, ImportedCompiledCssFile, ImportedFile } from "../importing";
import { PromiseQueue } from "../util/PromiseQueue";

import { BlockFactoryBase, sourceMapFromProcessedFile } from "./BlockFactoryBase";
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

// DEVELOPER NOTE: There's currently a lot of duplication between this file ane
// BlockFactorySync.ts. It's very likely that any change you're making here has to
// also be made over there. Please keep these files in sync.

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * This also ensures that importers and preprocessors are correctly used when loading a block file.
 */
export class BlockFactory extends BlockFactoryBase {
  parser: BlockParser;
  preprocessors: Preprocessors;

  private promises: ObjectDictionary<Promise<Block>>;
  private blocks: ObjectDictionary<Block>;
  private paths: ObjectDictionary<string>;
  private preprocessQueue: PromiseQueue<PreprocessJob, ProcessedFile>;

  get isSync(): false {
    return false;
  }

  constructor(options: Options, postcssImpl = postcss, faultTolerant = false) {
    super(options, postcssImpl, faultTolerant);
    this.preprocessors = this.configuration.preprocessors;
    this.parser = new BlockParser(options, this);
    this.blocks = {};
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
    super.reset();
    this.blocks = {};
    this.paths = {};
    this.promises = {};
  }

  /**
   * Parse a `postcss.Root` into a Block object. Save the Block promise and
   * return it. Use parseRoot if we need to catch errors.
   *
   * This function is referenced only in tests.
   * @param root The postcss.Root to parse.
   * @param identifier A unique identifier for this Block file.
   * @param name Default name for the block.
   * @param isDfnFile Whether to treat this as a definition file.
   * @returns The Block object promise.
   */
  parseRootFaultTolerant(root: postcss.Root, identifier: string, name: string, isDfnFile = false, expectedGuid?: string): Promise<Block> {
    return this.promises[identifier] = this.parser.parse(root, identifier, name, isDfnFile, expectedGuid);
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
   * @param isDfnFile Whether to treat this as a definition file.
   * @returns The Block object promise.
   */
  async parseRoot(root: postcss.Root, identifier: string, name: string, isDfnFile = false, expectedGuid?: string): Promise<Block> {
    const block = await this.parseRootFaultTolerant(root, identifier, name, isDfnFile, expectedGuid);
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

      let block: Block;
      if (file.type === "ImportedCompiledCssFile") {
        block = await this._reconstituteCompiledCssSource(file);
      } else {
        block = await this._importAndPreprocessBlock(file);
      }

      debug(`Finalizing Block object for "${block.identifier}"`);

      // last check to make sure we don't return a new instance
      if (this.blocks[block.identifier]) {
        return this.blocks[block.identifier];
      }

      // Ensure this block name is unique.
      const uniqueName = this.getUniqueBlockName(block.name, block.identifier, file.type === "ImportedCompiledCssFile");
      if (uniqueName === null) {
        // For ImportedCompiledCssFiles, leave the name alone and add an error.
        block.addError(
          new CssBlockError(`Block uses a name that has already been used by ${this.blockNames[block.name]}`, {
            filename: block.identifier,
          }),
        );
        block.setName(block.name);
      } else {
        block.setName(uniqueName);
      }

      // We only register guids from blocks that don't have errors because those will get re-parsed.
      if (block.isValid()) {
        // Ensure the GUID is unique.
        const guidRegResult = this.registerGuid(block.guid);
        if (!guidRegResult) {
          block.addError(
              new CssBlockError("Block uses a GUID that has already been used! Check dependencies for conflicting GUIDs and/or increase the number of significant characters used to generate GUIDs.", {
                filename: block.identifier,
              },
            ),
          );
        }
      }

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
   * Parse the file into a `Block`. Specifically, this method runs the data through any related
   * preprocessor (such as a SASS or LESS compiler), parses the CSS into an AST using PostCSS, then
   * hands the AST off to the Block parser to validate the CSS and transform it into the Block
   * class used by CSS Blocks.
   *
   * Notably, this method expects that any related file data has already been loaded from memory
   * using the Importer.
   *
   * @param file - The file information that has been previously imported by the Importer, for
   *               a single block identifier.
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

  private async _reconstituteCompiledCssSource(file: ImportedCompiledCssFile): Promise<Block> {
    // Maybe we already have this block in cache?
    if (this.blocks[file.identifier]) {
      debug(`Using pre-compiled Block for "${file.identifier}"`);
      return this.blocks[file.identifier];
    }

    const { definitionAst, cssContentsAst } = this._prepareDefinitionASTs(file);

    // Construct a Block out of the definition file.
    const block = await this.parser.parseDefinitionSource(definitionAst, file.identifier, file.blockId, file.defaultName);

    // Merge the rules from the CSS contents into the Block.
    block.precompiledStylesheet = cssContentsAst;
    block.precompiledStylesheetUnedited = file.rawCssContents;
    this._mergeCssRulesIntoDefinitionBlock(block, cssContentsAst, file);

    // And we're done!
    return block;
  }

    /**
   * Similar to getBlock(), this imports and parses a block data file. However, this
   * method parses a block relative to another block.
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
