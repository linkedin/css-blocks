import * as postcss from "postcss";

import { OutputMode } from "./OutputMode";
import { Plugin } from "./Plugin";
import { CssBlockError, InvalidBlockSyntax, MissingSourcePath } from "./errors";
import { Configuration } from "./options";

// This is ugly but it's the only thing I have been able to make work.
// I welcome a patch that cleans this up.

type temp = {
  (postcssImpl: typeof postcss): (opts?: Partial<Readonly<Configuration>>) => postcss.Plugin<Partial<Readonly<Configuration>>>;
  OutputMode: typeof OutputMode;
  CssBlockError: typeof CssBlockError;
  InvalidBlockSyntax: typeof InvalidBlockSyntax;
  MissingSourcePath: typeof MissingSourcePath;
};

function makeApi(): temp {
  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (opts?: Partial<Readonly<Configuration>>) => {
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
