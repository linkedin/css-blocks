import * as perfectionist from "perfectionist";
import * as postcss from "postcss";

import cssBlocks = require("../../src/cssBlocks");
import { SparseOptions } from "../../src/options";

export class BEMProcessor {
  process(filename: string, contents: string, cssBlocksOpts?: SparseOptions) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss);
    return postcss([
      cssBlocksProcessor(cssBlocksOpts),
      perfectionist({format: "compact", indentSize: 2}),
    ]).process(contents, processOpts);
  }
}
