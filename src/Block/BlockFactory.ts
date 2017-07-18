import * as postcss from "postcss";
import { Block } from "./Block";
import { IBlockFactory } from "./IBlockFactory";
import BlockParser from "../BlockParser";
import { PluginOptions, OptionsReader } from "../options";
import { Importer, FileIdentifier } from "../importing";

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * Note: this is a fake impl right now, callers can use it for api stability
 * but it's not yet used internally -- that will arrive in a subsequent commit.
 */
export class BlockFactory implements IBlockFactory {
  postcssImpl: typeof postcss;
  importer: Importer;
  options: OptionsReader;
  parser: BlockParser;
  private blocks: {
    [identifier: string]: Promise<Block>
  };
  constructor(options: PluginOptions, postcssImpl = postcss, importer?: Importer) {
    this.postcssImpl = postcssImpl;
    this.options = new OptionsReader(options);
    this.importer = importer || this.options.importer;
    this.parser = new BlockParser(this.postcssImpl, options, this);
    this.blocks = {};
  }
  getBlock(identifier: FileIdentifier): Promise<Block> {
    if (this.blocks[identifier]) {
      return this.blocks[identifier];
    } else {
      let blockPromise = this.importer.import(identifier, this.options).then(file => {
        let filename: string = this.importer.filesystemPath(identifier, this.options) || this.importer.inspect(identifier, this.options);
        let resultPromise = this.postcssImpl().process(file.contents, { from: filename });
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
}