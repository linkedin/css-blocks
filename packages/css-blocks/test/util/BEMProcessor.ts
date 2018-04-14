import { postcss } from "opticss";
import * as perfectionist from "perfectionist";

import { Options } from "../../src/configuration";
import cssBlocks = require("../../src/cssBlocks");

export class BEMProcessor {
  process(filename: string, contents: string, cssBlocksOpts?: Options) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss);
    return postcss([
      cssBlocksProcessor(cssBlocksOpts),
      perfectionist({format: "compact", indentSize: 2}),
    ]).process(contents, processOpts);
  }
}
