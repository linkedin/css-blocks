import { postcss, postcssSelectorParser as selectorParser } from "opticss";

export interface SourcePosition {
  line: number;
  column: number;
}
export interface SourceFile {
  filename: string;
}

export type SourceLocation = Partial<SourceFile> & SourcePosition;

export interface SourceRange extends Partial<SourceFile> {
  start: SourcePosition;
  end: SourcePosition;
}

/**
 * Reduces multiple `SourceLocation` objects into a single object capturing the
 * actual location of the source code on disk.
 * @param locations  An array of SourceLocation objects.
 * @returns An object containing the line number and column number.
 */
export function addSourcePositions(...locations: SourcePosition[]) {
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
 * Utility function to fetch the filename, start and end positions
 * of a given `postcss.Node`.
 * @param sourceFile  The source file name that contains this rule.
 * @param node  The PostCSS Node object in question.
 * @returns An object representing the filename, line number and column number.
 */
export function sourceRange(filename: string, node: postcss.Node): SourceRange | SourceFile {
  if (node.source && node.source.start && node.source.end) {
    let {start, end} = node.source;
    return {
      filename,
      start,
      end,
    };
  } else {
    return { filename };
  }
}

/**
 * Logging utility function to fetch the filename, line number and column number
 * of a given selector.
 * @param filename  The source file name that contains this rule.
 * @param rule  The PostCSS Rule object containing this selector.
 * @param selector  The PostCSS selector node in question.
 * @returns An object representing the filename, line number and column number.
 */
export function selectorSourceRange(filename: string, rule: postcss.Rule, selector: selectorParser.Node): SourceRange | SourceFile {
  if (rule.source && rule.source.start && rule.source.end &&
      selector.source && selector.source.start && selector.source.end) {
    let start = addSourcePositions(rule.source.start, selector.source.start);
    let end = addSourcePositions(rule.source.start, selector.source.end);
    return {
      filename,
      start,
      end,
    };
  }
  return { filename };
}
