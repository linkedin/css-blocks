import * as postcss from "postcss";
import { Block } from "./Block";
import BlockParser from "../BlockParser";
import { PluginOptions, OptionsReader } from "../options";
import { Importer } from "../importing";

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * Note: this is a fake impl right now, callers can use it for api stability
 * but it's not yet used internally -- that will arrive in a subsequent commit.
 */
export class BlockFactory {
  postcssImpl: typeof postcss;
  importer: Importer;
  options: OptionsReader;
  parser: BlockParser;
  constructor(options: PluginOptions, importer?: Importer, postcssImpl = postcss) {
    this.postcssImpl = postcssImpl;
    this.options = new OptionsReader(options);
    this.importer = importer || this.options.importer;
    this.parser = new BlockParser(this.postcssImpl, options);
  }
  getBlock(blockPath: string): Promise<Block> {
    let a = 0;
    if (blockPath) {
      a += 1;
    }
    return Promise.resolve(new Block("placeholder", ""));
  }
  getBlockRelative(fromPath: string, blockPath: string): Promise<Block> {
    return this.options.importer(fromPath, blockPath).then(file => {
      let resultPromise = this.postcssImpl().process(file.contents, { from: file.path });
      return resultPromise.then(result => {
        if (result.root) {
          return this.parser.parse(result.root, file.path, this.options.importer.getDefaultName(file.path)).then(block => {
            return block;
          });
        } else {
          throw new Error("Missing root");
        }
      });
    });
  }
}