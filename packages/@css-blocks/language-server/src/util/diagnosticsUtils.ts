import { CssBlockError, errorHasRange } from "@css-blocks/core";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";

export function convertErrorsToDiagnostics(errors: CssBlockError[]): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];

    errors.forEach(error => {
      let range = error.location!;

      if (!errorHasRange(range)) {
        return;
      }

      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: range.start.line - 1,
            character: range.start.column - 1,
          },
          end: {
            line: range.end.line - 1,
            // TODO: explain why we are doing this better. their end character is
            // the next character after the end of the range.
            character: range.end.column,
          },
        },
        message: error.origMessage,
      };

      diagnostics.push(diagnostic);
    });

    return diagnostics;
}
