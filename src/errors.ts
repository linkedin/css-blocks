export interface SourceLocation {
  filename?: string;
  line: number;
  column: number;
}

export class CssBlockError extends Error {
  origMessage: string;
  _location?: SourceLocation | void;

  constructor(message, location?: SourceLocation | void) {
    super(message);
    this.origMessage = message;
    this.location = location;
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

  set location(location: SourceLocation | void) {
    this._location = location;
    super.message = this.annotatedMessage();
  }

}

export class MissingSourcePath extends CssBlockError {
  constructor() {
    super("PostCSS `from` option is missing." +
      " The source filename is required for CSS Blocks to work correctly.");
  }
}

export class InvalidBlockSyntax extends CssBlockError {
  constructor(message, location: SourceLocation | void) {
    super(message, location);
  }
}
