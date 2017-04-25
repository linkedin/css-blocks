import * as postcss from "postcss";
import * as path from "path";
import * as selectorParser from "postcss-selector-parser";

export namespace api {

  export enum OutputMode {
    BEM = 1
  }

  export interface PluginOptions {
    readonly outputMode: OutputMode;
  }

  export class CssBlockError extends Error {
  }

  export class MissingSourcePath extends CssBlockError {
    constructor() {
      super("PostCSS `from` option is missing." +
            " The source filename is required for CSS Blocks to work correctly.");
    }
  }
}

class OptionsReader implements api.PluginOptions {
  private _outputMode: api.OutputMode;

  constructor(opts: api.PluginOptions) {
    this._outputMode = opts.outputMode || api.OutputMode.BEM;
  }

  get outputMode() {
    return this._outputMode;
  }
  get outputModeName(): string {
    return api.OutputMode[this.outputMode];
  }
}

class Block {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }
  set name(name: string) {
    this._name = name;
  }
}

export default function initializer(postcssImpl: typeof postcss) {
  return postcssImpl.plugin("css-blocks", (pluginOptions: api.PluginOptions) => {
    let opts = new OptionsReader(pluginOptions);
    return (root, result) => {
      let sourceFile;
      if (result && result.opts && result.opts.from) {
        sourceFile = result.opts.from;
      } else {
        throw new api.MissingSourcePath();
      }
      let block = new Block(path.parse(sourceFile).name);
      root.walkRules((rule) => {
        let selector =  selectorParser().process(rule.selector).res;
        selector.walkPseudos((pseudo) => {
          if (pseudo.value === ":block") {
            pseudo.replaceWith(selectorParser.className({value: block.name}));
          }
        });
        rule.selector = selector.toString();
      });
    }
  });
}
