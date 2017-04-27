import { OutputMode } from "./OutputMode";

export interface PluginOptions {
  readonly outputMode?: OutputMode;
}

export class OptionsReader implements PluginOptions {
  private _outputMode: OutputMode;

  constructor(opts?: PluginOptions) {
    opts = opts || {};
    this._outputMode = opts.outputMode || OutputMode.BEM;
  }

  get outputMode() {
    return this._outputMode;
  }
  get outputModeName(): string {
    return OutputMode[this.outputMode];
  }
}
