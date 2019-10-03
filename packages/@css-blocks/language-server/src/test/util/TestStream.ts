import { Duplex } from "stream";

// NOTE: This approach is taken directly from the vscode-languageserver test suite
// https://github.com/microsoft/vscode-languageserver-node/blob/9382cd374845693b37e6c0913426205a2302dbeb/server/src/test/connection.test.ts
export class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }
  _read(_size: number) {
  }
}
