import * as postcss from "postcss";

import { PluginOptions } from "./options";
import { Plugin } from "./Plugin";
import { OutputMode } from "./OutputMode";
import { CssBlockError, InvalidBlockSyntax, MissingSourcePath } from "./errors";

function makeApi(): {
  (postcssImpl: typeof postcss): (opts?: PluginOptions) => any;
  OutputMode: typeof OutputMode;
  CssBlockError: typeof CssBlockError;
  InvalidBlockSyntax: typeof InvalidBlockSyntax;
  MissingSourcePath: typeof MissingSourcePath;
} {
  type temp = {
    (postcssImpl: typeof postcss): (opts?: PluginOptions) => any;
    OutputMode: typeof OutputMode;
    CssBlockError: typeof CssBlockError;
    InvalidBlockSyntax: typeof InvalidBlockSyntax;
    MissingSourcePath: typeof MissingSourcePath;
  };

  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (opts?: PluginOptions) => {
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
