import { BlockFactory, Options } from "@css-blocks/core";
import { postcss } from "opticss";

export function createBlockFactory(config: Options) {
  return new BlockFactory(config, postcss);
}
