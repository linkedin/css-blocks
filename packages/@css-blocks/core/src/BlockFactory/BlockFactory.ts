import { ObjectDictionary, isString } from "@opticss/util";
import * as debugGenerator from "debug";
import { postcss } from "opticss";
import { RawSourceMap } from "source-map";

import { BlockParser } from "../BlockParser";
import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { FileIdentifier, ImportedFile, Importer, Syntax, syntaxName } from "../Importer";

import { Preprocessor, Preprocessors, ProcessedFile, annotateCssContentWithSourceMap } from "./preprocessing";
import { PromiseQueue } from "./PromiseQueue";

const debug = debugGenerator("css-blocks:BlockFactory");

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
export class BlockFactory {
  postcssImpl: typeof postcss;
  importer: Importer;
  configuration: ResolvedConfiguration;
  blockNames: ObjectDictionary<number>;
  parser: BlockParser;
  preprocessors: Preprocessors;

  private promises: ObjectDictionary<Promise<Block>>;
  private blocks: ObjectDictionary<Block>;
  private paths: ObjectDictionary<string>;
  private preprocessQueue: PromiseQueue<PreprocessJob, ProcessedFile>;

  constructor(options: Options, postcssImpl = postcss) {
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
  }

  reset() {
    this.blocks = {};
    this.paths = {};
    this.promises = {};
    this.blockNames = {};
  }

  /**
   * Parse a `postcss.Root` into a Block object. Save the Block promise and return it.
   * TODO: This is only used in test. Remove in favor of the actual `getBlock` method.
   * @param root The postcss.Root to parse.
   * @param identifier A unique identifier for this Block file.
   * @param name Default name for the block.
   * @returns The Block object promise.
   */
  parse(filename: string, root: postcss.Root, defaultName: string): Promise<Block> {
    const identifier = this.importer.identifier(null, filename, this.configuration);
    debug(`Parsing Block ${identifier}`);

    // If we've already started work on this Block, return the same promise.
    if (this.promises[identifier]) { return this.promises[identifier]; }

    // Otherwise, kick off a new Block parse.
    return this.promises[identifier] = this.parser.parse(root, identifier, defaultName);
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

  getBlock(importPath: FileIdentifier, relativePath: string | null = null): Promise<Block> {

    const identifier = this.importer.identifier(relativePath, importPath, this.configuration);
    debug(`Getting Block ${identifier} for ${importPath}${relativePath ? ` (relative to ${relativePath})` : ""}.`);

    // If we've already started work on this Block, return the same promise.
    if (this.promises[identifier]) { return this.promises[identifier]; }

    // Otherwise, kick off a new Block build.
    return this.promises[identifier] = this._getBlock(identifier)

    // If it failed, drain the work queue and re-throw.
    .catch(async (err) => {
      debug(`Block error: "${err.message}"`);
      debug(`Currently there are ${this.preprocessQueue.activeJobCount} preprocessing jobs. waiting.`);
      await this.preprocessQueue.drain();
      debug(`Drain complete. Raising error.`);
      if (!relativePath) { throw err; }
      let fromPath = this.importer.debugIdentifier(relativePath, this.configuration);
      if (err.code === "ENOENT") { err.message = `From ${fromPath}: ${err.message}`; }
      throw err;
    });
  }

  private async _getBlock(identifier: string): Promise<Block> {

    // Fetch the Block identifier and metadata from this `importPath`.
    debug(`Fetching Block Metadata for ${identifier}`);
    const config = this.configuration;
    const file   = await this.importer.import(identifier, config);

    // If the file identifier maps back to a real filename, ensure it is actually unique.
    let realFilename = this.importer.filesystemPath(file.identifier, config);
    if (realFilename) {
      if (this.paths[realFilename] && this.paths[realFilename] !== file.identifier) {
        throw new Error(`The same block file was returned with different identifiers: ${this.paths[realFilename]} and ${file.identifier}`);
      } else {
        this.paths[realFilename] = file.identifier;
      }
    }
    debug(`Discovered Block file contents for ${identifier}.`);

    // Skip all this madness if we can.
    if (this.blocks[file.identifier]) { return this.blocks[file.identifier]; }

    // Preprocess the file.
    debug(`Preprocessing ${identifier}.`);
    const filename: string = realFilename || this.importer.debugIdentifier(file.identifier, config);
    const preprocessor = this.preprocessor(file);
    const preprocessResult = await this.preprocessQueue.enqueue({
      preprocessor,
      filename,
      contents: file.contents,
    });

    // Run through postcss
    debug(`Generating PostCSS AST for ${identifier} .`);
    let sourceMap = sourceMapFromProcessedFile(preprocessResult);
    let content = preprocessResult.content;
    if (sourceMap) { content = annotateCssContentWithSourceMap(content, sourceMap); }
    let result = await this.postcssImpl().process(content, { from: filename });

    // Otherwise, finally, parse our Block.
    debug(`Parsing Block for ${identifier} .`);
    const block = await this.parser.parseSource({
      identifier: file.identifier,
      timestamp: file.timestamp,
      defaultName: file.defaultName,
      parseResult: result,
      originalSource: file.contents,
      originalSyntax: file.syntax,
      dependencies: preprocessResult.dependencies || [],
    });

    // Ensure this block name is unique.
    block.setName(this.getUniqueBlockName(block.name));

    // We're done!
    debug(`Finished parsing Block for ${identifier} .`);
    return this.blocks[block.identifier] = block;
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
    const noop: Preprocessor = (_fullPath: string, content: string, _options: ResolvedConfiguration): Promise<ProcessedFile> => Promise.resolve({ content });
    const syntax = file.syntax;
    const preprocessor: Preprocessor | undefined = this.preprocessors[syntax];

    // If syntax is CSS, return the CSS preprocessor, or a no-op.
    if (syntax === Syntax.css) { return this.preprocessors.css || noop; }

    // If syntax is not CSS, and we haven't discovered a preprocessor, we don't know how to handle this file!
    if (!preprocessor) { throw new Error(`No preprocessor provided for ${syntaxName(syntax)}.`); }

    // Unless disabled, chain the discovered preprocessor with the CSS preprocessor.
    if (this.preprocessors.css && !this.configuration.disablePreprocessChaining) {
      return async (fullPath: string, content: string, configuration: ResolvedConfiguration): Promise<ProcessedFile> => {
        let res1 = await preprocessor(fullPath, content, configuration);
        let res2 = await this.preprocessors.css!(fullPath, res1.content.toString(), configuration, sourceMapFromProcessedFile(res1));
        return {
          content: res2.content,
          sourceMap: sourceMapFromProcessedFile(res2),
          dependencies: (res1.dependencies || []).concat(res2.dependencies || []),
        };
      };
    }

    // Otherwise, return the discovered preprocessor, or a no-op.
    return preprocessor;
  }
}

function sourceMapFromProcessedFile(result: ProcessedFile): RawSourceMap | string | undefined {
  let sourceMap: RawSourceMap | string | undefined = result.sourceMap;
  if (!sourceMap && !isString(result.content) && result.content.map) {
    sourceMap = result.content.map.toJSON();
  }
  return sourceMap;
}
