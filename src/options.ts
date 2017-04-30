import { OutputMode } from "./OutputMode";
import { Importer, filesystemImporter } from "./importing";

export interface PluginOptions {
  readonly outputMode?: OutputMode;
  readonly interoperableCSS?: boolean;
  readonly importer?: Importer;
}

export class OptionsReader implements PluginOptions {
  private _outputMode: OutputMode;
  private _interoperableCSS: boolean;
  private _importer: Importer;

  constructor(opts?: PluginOptions) {
    opts = opts || {};
    this._outputMode = opts.outputMode || OutputMode.BEM;
    this._interoperableCSS = opts.interoperableCSS || false;
    this._importer = opts.importer || filesystemImporter;
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

  get importer(): Importer {
    return this._importer;
  }
}
