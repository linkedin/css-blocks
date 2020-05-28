import { postcss } from "opticss";
import * as perfectionist from "perfectionist";

import { Options } from "../../src/configuration";
import cssBlocks = require(".././util/postcss-helper");

// Because the export style of postcss-helper.ts is non-standard, this
// duplicates the interface in that file. If you update one, update the other.
export interface MockConfigOpts {
  dfnFiles?: string[];
}

export class BEMProcessor {
  process(filename: string, contents: string, cssBlocksOpts?: Options, mockConfigOpts?: MockConfigOpts) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss);
    return postcss([
      cssBlocksProcessor(cssBlocksOpts, mockConfigOpts),
      perfectionist({format: "compact", indentSize: 2}),
    ]).process(contents, processOpts);
  }
}
