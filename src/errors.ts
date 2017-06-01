import { SourceLocation } from "./SourceLocation";

/**
 * Custom CSS Blocks error base class. Will format `SourceLocation` into thrown
 * error message if provided.
 */
export class CssBlockError extends Error {
  origMessage: string;
  private _location?: SourceLocation | void;

  constructor(message: string, location?: SourceLocation | void) {
    super(message);
    this.origMessage = message;
    this._location = location;
    super.message = this.annotatedMessage();
  }

  private annotatedMessage() {
    let loc = this.location;
    if (loc) {
      if (loc.filename) {
        return `${this.origMessage} (${loc.filename}:${loc.line}:${loc.column})`;
      } else {
        return `${this.origMessage} (:${loc.line}:${loc.column})`;
      }
    } else {
      return this.origMessage;
    }
  }

  get location(): SourceLocation | void {
    return this._location;
  }

}

/**
 * Custom CSS Blocks error for missing source path from PostCSS
 */
export class MissingSourcePath extends CssBlockError {
  constructor() {
    super("PostCSS `from` option is missing." +
      " The source filename is required for CSS Blocks to work correctly.");
  }
}

/**
 * Custom CSS Blocks error for Block syntax error
 */
export class InvalidBlockSyntax extends CssBlockError {
  constructor(message: string, location?: SourceLocation) {
    super(message, location);
  }
}
