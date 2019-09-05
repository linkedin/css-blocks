import { SourceRange } from "@css-blocks/core";
import * as fs from "fs";
export interface ExtractionResult {
  lines: string[];
  additionalLines: {
    before: number;
    after: number;
  };
}
export function extractLinesFromSource(
  range: Required<SourceRange> & { source?: string },
  additionalLinesBefore = 1,
  additionalLinesAfter = 0,
): ExtractionResult | undefined {
  let contents: string | undefined;
  let { filename, start, end, source } = range;
  try {
    contents = source || fs.readFileSync(filename, "utf-8");
  } catch (e) {
    return;
  }
  let allLines = contents.split(/\r?\n/);
  if (start.line <= additionalLinesBefore) {
    additionalLinesBefore = start.line - 1;
  }
  if (end.line + additionalLinesAfter > allLines.length ) {
    additionalLinesAfter = allLines.length - end.line;
  }
  let firstLine = start.line - additionalLinesBefore - 1;
  let lastLine = end.line + additionalLinesAfter;
  let lines = allLines.slice(firstLine, lastLine);
  return {
    lines,
    additionalLines: {
      before: additionalLinesBefore,
      after: additionalLinesAfter,
    },
  };
}
