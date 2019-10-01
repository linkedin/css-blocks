import { CssBlockError } from "@css-blocks/core/dist/src";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { PublishDiagnosticsParams } from "vscode-languageserver-protocol";

import { DiagnosticsManager, SendDiagnosticsDelegate } from "../../services/diagnostics";

@suite("DiagnosticsManagerTest")
export class DiagnosticsManagerTest {
  @test async "it sends an empty diagnostics array when none of the errors have a location"() {
    let expectedUri = "test/uri";

    class Connection implements SendDiagnosticsDelegate {
      sendDiagnostics(params: PublishDiagnosticsParams): void {
        assert.equal(params.uri, expectedUri, "The expected uri is passed to the delegate");
        assert.equal(params.diagnostics.length, 0, "An empty diagnostics list is sent");
      }
    }

    let connection = new Connection();
    let diagnosticsManager = new DiagnosticsManager(connection);
    let error = new CssBlockError("dummy error message");
    let errors: CssBlockError[] = [error];

    await diagnosticsManager.sendDiagnostics(errors, expectedUri);
  }
}
