
export interface ErrorLocation {
  filename?: string;
  line?: number;
  column?: number;
}

/**
 * Custom CSS Blocks error base class. Will format `SourceLocation` into thrown
 * error message if provided.
 */
export class CssBlockError extends Error {
  static prefix = "Error";
  origMessage: string;
  private _location?: ErrorLocation | void;
  constructor(message: string, location?: ErrorLocation | void) {
    super(message);
    this.origMessage = message;
    this._location = location;
    super.message = this.annotatedMessage();
  }

  private annotatedMessage() {
    let loc = this.location;
    if ( !loc ) {
      return this.origMessage;
    }
    let filename = loc.filename || '';
    let line = loc.line ? `:${loc.line}` : '';
    let column = loc.column ? `:${loc.column}` : '';
    let locMessage = ` (${filename}${line}${column})`;
    return `[css-blocks] ${(this.constructor as any).prefix}: ${this.origMessage}${locMessage}`;
  }

  get location(): ErrorLocation | void {
    return this._location;
  }

}

/**
 * Custom CSS Blocks error type for template analysis errors.
 */
export class TemplateAnalysisError extends CssBlockError {
  static prefix = "TemplateError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}

/**
 * Custom CSS Blocks error for missing source path from PostCSS
 */
export class MissingSourcePath extends CssBlockError {
  static prefix = "SourcePathError";
  constructor() {
    super("PostCSS `from` option is missing. The source filename is required for CSS Blocks to work correctly.");
  }
}

/**
 * Custom CSS Blocks error for Block syntax error
 */
export class InvalidBlockSyntax extends CssBlockError {
  static prefix = "BlockSyntaxError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}
