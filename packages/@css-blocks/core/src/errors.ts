import * as SourceLocation from "./SourceLocation";

// TODO: Remove these types and use source location types everywhere.
export type Position = SourceLocation.SourcePosition;
export type ErrorWithoutPosition = Partial<SourceLocation.SourceFile>;
export type ErrorWithPosition = Required<SourceLocation.SourceRange>;
export type ErrorWithMappedPosition = SourceLocation.MappedSourceRange;
export type ErrorLocation = ErrorWithoutPosition | ErrorWithPosition | ErrorWithMappedPosition;

export function hasMappedPosition(loc: ErrorLocation): loc is ErrorWithMappedPosition {
  return (typeof (<ErrorWithMappedPosition>loc).generated === "object");
}

export function hasErrorPosition(location: ErrorLocation | void): location is ErrorWithPosition {
  return location && typeof (<ErrorWithPosition>location).start === "object" || false;
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
    if (!loc) {
      return this.origMessage;
    }
    let filename = loc.filename || "<unknown file>";
    let line: string | number = "";
    let column: string | number = "";
    if (hasErrorPosition(loc)) {
      line = `:${loc.start.line}`;
      column = `:${loc.start.column}`;
    }
    let locMessage = ` (${filename}${line}${column})`;
    // tslint:disable-next-line:prefer-unknown-to-any
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
  constructor(message: string, location?: ErrorLocation, details?: string) {
    super(message, location);
    if (details) { this.message += `\n${details}`; }
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

/**
 * Custom CSS Blocks error type for malformed BlockPath errors.
 */
export class BlockPathError extends CssBlockError {
  static prefix = "MalformedBlockPath";
  constructor(message: string, location?: ErrorLocation, details?: string) {
    super(message, location);
    if (details) { this.message += `\n${details}`; }
  }
}
