import { postcss } from "opticss";

import { Configuration, OutputMode } from "./configuration";
import { CssBlockError, InvalidBlockSyntax, MissingSourcePath } from "./errors";
import { Plugin } from "./Plugin";

// This is ugly but it's the only thing I have been able to make work.
// I welcome a patch that cleans this up.

type temp = {
  (postcssImpl: typeof postcss): (config?: Partial<Readonly<Configuration>>) => postcss.Plugin<Partial<Readonly<Configuration>>>;
  OutputMode: typeof OutputMode;
  CssBlockError: typeof CssBlockError;
  InvalidBlockSyntax: typeof InvalidBlockSyntax;
  MissingSourcePath: typeof MissingSourcePath;
};

function makeApi(): temp {
  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (config?: Partial<Readonly<Configuration>>) => {
      let plugin = new Plugin(postcssImpl, config);
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
