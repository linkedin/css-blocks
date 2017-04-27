import * as postcss from "postcss";

import { PluginOptions } from "./options";
import { Plugin } from "./Plugin";
import { OutputMode } from "./OutputMode";

function makeApi(): any {
  type temp = {
    (postcssImpl: typeof postcss): (opts?: PluginOptions) => any;
    OutputMode: typeof OutputMode;
  };

  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (opts?: PluginOptions) => {
      let plugin = new Plugin(postcssImpl, opts);
      return plugin.process.bind(plugin);
    };
  };
  cssBlocks.OutputMode = OutputMode;
  return cssBlocks;
}

export = makeApi();
