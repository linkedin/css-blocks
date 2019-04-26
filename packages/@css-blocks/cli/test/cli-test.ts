import assert = require("assert");
import path = require("path");

import { TestCLI as CLI } from "./TestCLI";

function fixture(...relativePathSegments: Array<string>): string {
  return path.resolve(__dirname, "..", "..", "test", "fixtures", ...relativePathSegments);
}

describe("CLI", () => {
  it("can check syntax for a valid block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("simple.block.css")]);
    assert.equal(cli.output, `ok\t${fixture("simple.block.css")}\n`);
    assert.equal(cli.exitCode, 0);
  });
  it("can check syntax for a bad block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("error.block.css")]);
    assert.equal(cli.output, `error\t${fixture("error.block.css")}:1:5 Two distinct classes cannot be selected on the same element: .foo.bar\n`);
    assert.equal(cli.exitCode, 1);
  });
});
