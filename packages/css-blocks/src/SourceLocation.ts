import * as postcss from "postcss";
import * as selectorParser from "postcss-selector-parser";

export interface SourceLocation {
  filename?: string;
  line: number;
  column: number;
}

/**
 * Reduces multiple `SourceLocation` objects into a single object capturing the
 * actual location of the source code on disk.
 * @param locations  An array of SourceLoation objects.
 * @returns An object containing the line number and column number.
 */
export function addSourceLocations(...locations: SourceLocation[]) {
  return locations.reduce((l, o) => {
    if (o.line === 1) {
      return {
        line: l.line,
        column: l.column + o.column - 1,
      };
    } else {
      return {
        line: l.line + o.line - 1,
        column: o.column,
      };
    }
  });
}

/**
 * Logging utility function to fetch the filename, line number and column number
 * of a given `postcss.Node`.
 * @param sourceFile  The source file name that contains this rule.
 * @param node  The PostCSS Node object in question.
 * @returns An object representing the filename, line number and column number.
 */
export function sourceLocation(sourceFile: string, node: postcss.Node): SourceLocation | undefined {
  if (node.source && node.source.start) {
    let loc = node.source.start;
    return {
      filename: sourceFile,
      line: loc.line,
      column: loc.column,
    };
  }
  return;
}

/**
 * Logging utility function to fetch the filename, line number and column number
 * of a given selector.
 * @param sourceFile  The source file name that contains this rule.
 * @param rule  The PostCSS Rule object containing this selector.
 * @param selector  The PostCSS selector node in question.
 * @returns An object representing the filename, line number and column number.
 */
export function selectorSourceLocation(sourceFile: string, rule: postcss.Rule, selector: selectorParser.Node): SourceLocation | undefined {
  if (rule.source && rule.source.start && selector.source && selector.source.start) {
    let loc = addSourceLocations(rule.source.start, selector.source.start);
    return {
      filename: sourceFile,
      line: loc.line,
      column: loc.column,
    };
  }
  return;
}
