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

export function errorHasRange(location: ErrorLocation | undefined): location is ErrorWithPosition {
  return location && typeof (<ErrorWithPosition>location).start === "object" || false;
}

interface HasPrefix {
  prefix?: string;
}

/**
 * Custom CSS Blocks error base class. Will format `SourceLocation` into thrown
 * error message if provided.
 */
export class CssBlockError extends Error {
  static prefix = "Error";
  origMessage: string;
  private _location?: ErrorLocation;
  constructor(message: string, location?: ErrorLocation) {
    super(message);
    this.origMessage = message;
    this._location = location;
    super.message = this.annotatedMessage();
  }

  private annotatedMessage() {
    let loc = this.location;
    if (loc) {
      let prefix = (<HasPrefix>this.constructor).prefix;
      return `[css-blocks] ${prefix || CssBlockError.prefix}: ${this.origMessage} (${charInFile(loc)})`;
    } else {
      return this.origMessage;
    }
  }

  get location(): ErrorLocation | undefined {
    return this._location;
  }
}

function hasSourcePosition(filenameOrPosition: string | ErrorWithoutPosition | ErrorWithPosition | SourceLocation.SourceLocation): filenameOrPosition is SourceLocation.SourceLocation {
  return typeof (<SourceLocation.SourceLocation>filenameOrPosition).line === "number";
}

export function charInFile(filename: string | ErrorWithoutPosition, position: SourceLocation.SourcePosition | undefined): string;
export function charInFile(position: ErrorWithPosition | SourceLocation.SourceLocation | ErrorLocation): string;
export function charInFile(filename: string, line: number, column: number): string;
export function charInFile(filenameOrPosition: string | ErrorWithoutPosition | ErrorWithPosition | SourceLocation.SourceLocation | ErrorLocation, lineOrPosition?: SourceLocation.SourcePosition | number | undefined, column?: number | undefined): string {
  let filename: string;
  let line: number | undefined;
  if (typeof filenameOrPosition === "object") {
    filename = filenameOrPosition.filename || "<unknown file>";
    if (errorHasRange(filenameOrPosition)) {
      line = filenameOrPosition.start.line;
      column = filenameOrPosition.start.column;
    } else if (hasSourcePosition(filenameOrPosition)) {
      line = filenameOrPosition.line;
      column = filenameOrPosition.column;
    }
  } else {
    filename = filenameOrPosition;
  }
  if (typeof lineOrPosition === "object") {
    line = lineOrPosition.line;
    column = lineOrPosition.column;
  } else if (typeof lineOrPosition === "number") {
    line = lineOrPosition;
  }
  if (typeof line === "number" && typeof column === "number") {
    return `${filename}:${line}:${column}`;
  } else {
    return filename;
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

/**
 * Acts as a collection of CssBlockErrors along with utility methods to add and
 * clear errors
 */
export class MultipleCssBlockErrors extends CssBlockError {
  static prefix = "Caused by multiple errors";
  private _errors: CssBlockError[] = [];

  constructor(errors: CssBlockError[], location?: ErrorLocation, details?: string) {
    super(MultipleCssBlockErrors.prefix, location);
    for (let err of errors) {
      if (err instanceof MultipleCssBlockErrors) {
        // flatten all MultipleCssBlockErrors
        // This normally happens if there is a transitive error
        for (let e of err.errors) {
          this._errors.push(e);
        }
      } else {
        this._errors.push(err);
      }
    }
    if (!details) {
      details = ":";
      details += errorDetails(this);
    }
    this.message += details;
  }

  add(error: CssBlockError) {
    this._errors.push(error);
  }
  get errors(): CssBlockError[] {
    return this._errors;
  }
  clear() {
    this._errors = [];
  }
}

export class CascadingError extends CssBlockError {
  static prefix = "CascadingError";
  cause: CssBlockError;
  constructor(message: string, rootCause: CssBlockError, location?: ErrorLocation) {
    super(message, location);
    this.cause = rootCause;
  }
}

function errorDetails(error: MultipleCssBlockErrors, indent = ""): string {
  let details = "";
  let i = 0;
  for (let err of error.errors) {
    details += `\n${indent}${++i}. ${err}`;
    if (err instanceof CascadingError) {
      if (err.cause instanceof MultipleCssBlockErrors && err.cause.errors.length > 1) {
        details += `\n${indent}   ${i > 9 ? " " : ""}Caused by multiple errors:`;
        details += errorDetails(err.cause, indent + "\t");
      } else {
        let cause = err.cause instanceof MultipleCssBlockErrors ? err.cause.errors[0] : err.cause;
        details += `\n${indent}    ${i > 9 ? " " : ""}Caused by:`;
        details += `\n${indent} ${cause}`;
      }
    }
  }
  return details;
}
