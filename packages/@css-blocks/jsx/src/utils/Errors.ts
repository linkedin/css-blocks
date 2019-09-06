import { CssBlockError } from "@css-blocks/core";

export interface ErrorLocation {
  filename?: string;
  line?: number;
  column?: number;
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
