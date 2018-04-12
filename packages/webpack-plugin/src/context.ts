import { ObjectDictionary } from "@opticss/util";
import { Options } from "css-blocks";
import { loader } from "webpack";

import { PendingResult } from "./Plugin";

export interface CssBlocksContext {
  mappings: ObjectDictionary<PendingResult>;
  compilationOptions: Partial<Readonly<Options>>;
}

export interface LoaderContext extends loader.LoaderContext {
  cssBlocks: CssBlocksContext;
}
