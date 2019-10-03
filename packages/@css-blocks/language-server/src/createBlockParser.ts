import { BlockFactory, Options } from "@css-blocks/core/dist/src";
import { BlockParser } from "@css-blocks/core/dist/src/BlockParser/BlockParser";

export function createBlockParser(config: Options, factory: BlockFactory) {
  return new BlockParser(config, factory);
}
