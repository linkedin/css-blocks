import * as postcss from "postcss";
import * as perfectionist from "perfectionist";

import { PluginOptions } from "../../src/Options";
import cssBlocks = require("../../src/cssBlocks");

export default class BEMProcessor {
  process(filename: string, contents: string, cssBlocksOpts?: PluginOptions) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss);
    return postcss([
      cssBlocksProcessor(cssBlocksOpts),
      perfectionist({format: "compact", indentSize: 2})
    ]).process(contents, processOpts);
  }
}
