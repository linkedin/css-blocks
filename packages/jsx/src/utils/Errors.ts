
export interface ErrorLocation {
  filename?: string;
  line?: number;
  column?: number;
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
    let filename = loc.filename || "";
    let line = loc.line ? `${filename ? ":" : ""}${loc.line}` : "";
    let column = loc.column ? `:${loc.column}` : "";
    let locMessage = ` (${filename}${line}${column})`;
    let c = <HasPrefix>this.constructor;
    return `[css-blocks] ${c.prefix || CssBlockError.prefix}: ${this.origMessage}${locMessage}`;
  }

  get location(): ErrorLocation | void {
    return this._location;
  }

}

/**
 * Custom JSX Parser error type for template import errors.
 */
export class JSXParseError extends CssBlockError {
  static prefix = "JSXParseError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}

/**
 * Custom CSS Blocks error type for template analysis errors.
 */
export class TemplateAnalysisError extends CssBlockError {
  static prefix = "AnalysisError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}

/**
 * Custom CSS Blocks error type for template import errors.
 */
export class TemplateImportError extends CssBlockError {
  static prefix = "ImportError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}

/**
 * Custom CSS Blocks error type for template import errors.
 */
export class TemplateRewriteError extends CssBlockError {
  static prefix = "RewriteError";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}

/**
 * Custom CSS Blocks error type for template import errors.
 */
export class MalformedBlockPath extends CssBlockError {
  static prefix = "MalformedBlockPath";
  constructor(message: string, location?: ErrorLocation) {
    super(message, location);
  }
}
