import { CssBlockError, errorHasRange } from "@css-blocks/core/dist/src";
import {
  Diagnostic,
  DiagnosticSeverity,
  PublishDiagnosticsParams,
} from "vscode-languageserver";

export interface SendDiagnosticsDelegate {
  sendDiagnostics(params: PublishDiagnosticsParams): void;
}

export class DiagnosticsManager {
  connection: SendDiagnosticsDelegate;

  constructor(connection: SendDiagnosticsDelegate) {
    this.connection = connection;
  }

  async sendDiagnostics(errors: CssBlockError[], uri: string): Promise<void> {
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

    this.connection.sendDiagnostics({ uri, diagnostics });
  }
}
