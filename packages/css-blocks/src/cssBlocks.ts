import * as postcss from "postcss";

import { OutputMode } from "./OutputMode";
import { Plugin } from "./Plugin";
import { CssBlockError, InvalidBlockSyntax, MissingSourcePath } from "./errors";
import { CssBlockOptions } from "./options";

// This is ugly but it's the only thing I have been able to make work.
// I welcome a patch that cleans this up.

function makeApi(): {
  (postcssImpl: typeof postcss): (opts?: Partial<Readonly<CssBlockOptions>>) => any;
  OutputMode: typeof OutputMode;
  CssBlockError: typeof CssBlockError;
  InvalidBlockSyntax: typeof InvalidBlockSyntax;
  MissingSourcePath: typeof MissingSourcePath;
} {
  type temp = {
    (postcssImpl: typeof postcss): (opts?: Partial<Readonly<CssBlockOptions>>) => any;
    OutputMode: typeof OutputMode;
    CssBlockError: typeof CssBlockError;
    InvalidBlockSyntax: typeof InvalidBlockSyntax;
    MissingSourcePath: typeof MissingSourcePath;
  };

  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (opts?: Partial<Readonly<CssBlockOptions>>) => {
      let plugin = new Plugin(postcssImpl, opts);
      return plugin.process.bind(plugin);
    };
  };
  cssBlocks.OutputMode = OutputMode;
  cssBlocks.CssBlockError = CssBlockError;
  cssBlocks.InvalidBlockSyntax = InvalidBlockSyntax;
  cssBlocks.MissingSourcePath = MissingSourcePath;
  return cssBlocks;
}

export = makeApi();
