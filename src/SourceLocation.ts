export interface SourceLocation {
  filename?: string;
  line: number;
  column: number;
}

export function addSourceLocations(...locations: SourceLocation[]) {
  return locations.reduce((l, o) => {
    if (o.line === 1) {
      return {
        line: l.line,
        column: l.column + o.column - 1
      };
    } else {
      return {
        line: l.line + o.line - 1,
        column: o.column
      };
    }
  });
}

export function sourceLocation(sourceFile, node): SourceLocation | undefined {
  if (node.source) {
    let loc = node.source.start;
    return {
      filename: sourceFile,
      line: loc.line,
      column: loc.column
    };
  }
  return;
}

export function selectorSourceLocation(sourceFile: string, rule, selector): SourceLocation | undefined {
  if (rule.source && rule.source.start && selector.source && selector.source.start) {
    let loc = addSourceLocations(rule.source.start, selector.source.start);
    return {
      filename: sourceFile,
      line: loc.line,
      column: loc.column
    };
  }
  return;
}