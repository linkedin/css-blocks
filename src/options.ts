import { OutputMode } from "./OutputMode";

export interface PluginOptions {
  readonly outputMode?: OutputMode;
  readonly interoperableCSS?: boolean;
}

export class OptionsReader implements PluginOptions {
  private _outputMode: OutputMode;
  private _interoperableCSS: boolean;

  constructor(opts?: PluginOptions) {
    opts = opts || {};
    this._outputMode = opts.outputMode || OutputMode.BEM;
    this._interoperableCSS = opts.interoperableCSS || false;
  }

  get interoperableCSS() {
    return this._interoperableCSS;
  }

  get outputMode() {
    return this._outputMode;
  }

  get outputModeName(): string {
    return OutputMode[this.outputMode];
  }
}
