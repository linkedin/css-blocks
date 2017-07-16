import { OutputMode } from "./OutputMode";
import { Importer, filesystemImporter } from "./importing";

export interface ImporterData {
  [key: string]: any;
}

/**
 * Valid user-provided options for the CSS Blocks plugin.
 */
export interface PluginOptions {
  readonly outputMode?: OutputMode;
  readonly interoperableCSS?: boolean;
  readonly importer?: Importer;
  readonly rootDir?: string;
  readonly data?: ImporterData;
}

/**
 * Provides read-only access to options values. Provides default values if none
 * passed.
 */
export class OptionsReader implements PluginOptions {
  private _outputMode: OutputMode;
  private _interoperableCSS: boolean;
  private _importer: Importer;
  private _rootDir: string;
  private _data: ImporterData;

  constructor(opts?: PluginOptions) {
    opts = opts || {};
    this._outputMode = opts.outputMode || OutputMode.BEM;
    this._interoperableCSS = opts.interoperableCSS || false;
    this._importer = opts.importer || filesystemImporter;
    this._rootDir = opts.rootDir || process.cwd();
    this._data = Object.assign({}, opts.data);
  }

  get outputMode() {
    return this._outputMode;
  }

  get outputModeName(): string {
    return OutputMode[this.outputMode];
  }

  get interoperableCSS() {
    return this._interoperableCSS;
  }

  get importer(): Importer {
    return this._importer;
  }

  get rootDir(): string {
    return this._rootDir;
  }

  get data(): ImporterData {
    return this._data;
  }
}
