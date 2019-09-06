import { postcss, postcssSelectorParser as selectorParser } from "opticss";
import * as path from "path";
import { MappedPosition, SourceMapConsumer } from "source-map";

import { Configuration } from "./configuration";

/**
 * Represents a character.
 */
export interface SourcePosition {
  /**
   * 1-based index of the line containing the character.
   */
  line: number;
  /**
   * 1-based index of the column containing the character.
   */
  column: number;
}
export interface SourceFile {
  filename: string;
}

export type SourceLocation = Partial<SourceFile> & SourcePosition;

/**
 * Represents a text range in a file.
 * The range is inclusive of both the start and end characters,
 * so a range of a single character will have the same value for the
 * start and the end positions.
 */
export interface SourceRange extends Partial<SourceFile> {
  start: SourcePosition;
  end: SourcePosition;
}

/**
 * Represents the source range with additional range information that spans the
 * same location in the output from compiling that source.
 *
 * Because we use the source map to work backwards from the generated output,
 * the range information as it applies to the generated source is more accurate,
 * but also less actionable.
 */
export interface MappedSourceRange extends Required<SourceRange> {
  generated: Required<SourceRange> & {
    source: string;
  };
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
        column: l.column + o.column - 1, // -1 because 1-based index math
      };
    } else {
      return {
        line: l.line + o.line - 1, // -1 because 1-based index math
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
export function sourceRange(configuration: Configuration, root: postcss.Root | null | undefined, filename: string, node: postcss.Node): MappedSourceRange | SourceRange | SourceFile {
  if (node.source && node.source.start && node.source.end) {
    let {start, end} = node.source;
    return sourceOrSourceMappedRange(configuration, root, filename, start, end);
  } else {
    return { filename };
  }
}

const CSS_CONTENT_CACHE = new WeakMap();
function sourceOrSourceMappedRange(configuration: Configuration, root: postcss.Root | null | undefined, filename: string, start: SourcePosition, end: SourcePosition): SourceRange | MappedSourceRange {
    // try to trace the error back to the source file using sourcemap information.
    if (root && root.source && root.source.input.map) {
      let consumer = root.source.input.map.consumer();
      // the original result text isn't easy to get at from here,
      // so we're using the stringified version and caching it.
      let source = CSS_CONTENT_CACHE.get(root);
      if (!source) {
        source = root.toResult().css;
        CSS_CONTENT_CACHE.set(root, source);
      }
      return pickBestSourceRange(configuration, filename, source, consumer, start, end);
    }
    return {
      filename,
      start,
      end,
    };
}

/**
 * Utility function to fetch the filename, line number and column number
 * of a given selector.
 * @param filename  The source file name that contains this rule.
 * @param rule  The PostCSS Rule object containing this selector.
 * @param selector  The PostCSS selector node in question.
 * @returns An object representing the filename, line number and column number.
 */
export function selectorSourceRange(configuration: Configuration, root: postcss.Root | null | undefined, filename: string, rule: postcss.Rule, selector: selectorParser.Node): SourceRange | SourceFile | MappedSourceRange {
  if (rule.source && rule.source.start && rule.source.end &&
      selector.source && selector.source.start && selector.source.end) {
    let start = addSourcePositions(rule.source.start, selector.source.start);
    let end = addSourcePositions(rule.source.start, selector.source.end);
    return sourceOrSourceMappedRange(configuration, root, filename, start, end);
  }
  return { filename };
}

/**
 * The type actually allows null values for all these properties.
 */
type NullableMappedPosition  = {
  [key in keyof MappedPosition]: MappedPosition[key] | null;
};

/**
 * Source mapping to the right location is a bit of an art and is highly
 * dependent on how the underlying language implementation maps bytes. This
 * function is basically a heuristic that tries to give back the best possible
 * source range for the generated range.
 *
 * Because it's not always accurate, it also returns the generated source and
 * location so that context can be used as well.
 */
function pickBestSourceRange(configuration: Configuration, filename: string, source: string, consumer: ReturnType<postcss.PreviousMap["consumer"]> , start: SourcePosition, end: SourcePosition): MappedSourceRange | SourceRange {
  let generated = { filename, start, end, source };
  // Fun fact! The positions returned by the source map consumer use a 1-based
  // index for lines, and a 0-based index for columns.
  let startOrigin: NullableMappedPosition = consumer.originalPositionFor({ line: start.line, column: start.column - 1, bias: SourceMapConsumer.LEAST_UPPER_BOUND});
  let endOrigin: NullableMappedPosition = consumer.originalPositionFor({ line: end.line, column: end.column - 1, bias: SourceMapConsumer.LEAST_UPPER_BOUND});
  // If the start and end locations of the origins are in different files,
  // we try different biases to see if we can get something that agrees.
  if (startOrigin.source && startOrigin.source !== endOrigin.source) {
    let startOrigin2: NullableMappedPosition = consumer.originalPositionFor({ line: start.line, column: start.column - 1, bias: SourceMapConsumer.GREATEST_LOWER_BOUND });
    let endOrigin2: NullableMappedPosition = consumer.originalPositionFor({ line: end.line, column: end.column - 1, bias: SourceMapConsumer.GREATEST_LOWER_BOUND });
    if (startOrigin2.source && startOrigin2.source === endOrigin.source) {
      startOrigin = startOrigin2;
    } else if (endOrigin2.source && startOrigin.source === endOrigin2.source) {
      endOrigin = endOrigin2;
    } else if (startOrigin2.source && endOrigin2.source && startOrigin2.source === endOrigin2.source) {
      startOrigin = startOrigin2;
      endOrigin = endOrigin2;
    } else if (startOrigin.line !== null && startOrigin.column !== null) {
      // pick the starting file's location and add a character.
      endOrigin = { ...startOrigin, ...{ column: startOrigin.column + 1 } };
    } else if (endOrigin.line !== null && endOrigin.column !== null && endOrigin.column > 0) {
      // pick the ending file's location and remove a character.
      startOrigin = { ...endOrigin, ...{ column: endOrigin.column - 1 } };
    } else {
      // I don't think we'll get here
      return { filename, start, end };
    }
  }
  if (startOrigin.source && endOrigin.source && startOrigin.source === endOrigin.source) {
    if (startOrigin.line !== null && startOrigin.column !== null &&
        endOrigin.line !== null && endOrigin.column !== null) {
      filename = path.resolve(configuration.rootDir, filename, startOrigin.source);
      // column+1 to translate to our 1-based index for columns
      start = { line: startOrigin.line, column: startOrigin.column + 1 };
      end = { line: endOrigin.line, column: endOrigin.column + 1 };
      // There must be an off-by-one error... somewhere.
      // Subtracting 1 here seems to work but I don't have a good reason for it.
      if (isGreaterPosition(end, start)) {
        end.column = end.column - 1;
      }
    }
  }
  return { filename, start, end, generated };
}

/**
 * Returns true if p1 comes after the position p2.
 */
function isGreaterPosition(p1: SourcePosition, p2: SourcePosition): boolean {
  return p1.line === p2.line && p1.column > p2.column
      || p1.line > p2.line;
}
