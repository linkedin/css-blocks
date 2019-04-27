import assert = require("assert");
import path = require("path");

import { TestCLI as CLI } from "./TestCLI";

function fixture(...relativePathSegments: Array<string>): string {
  return path.resolve(__dirname, "..", "..", "test", "fixtures", ...relativePathSegments);
}
function relFixture(...relativePathSegments: Array<string>): string {
  return path.relative(process.cwd(), fixture(...relativePathSegments));
}

function distFile(...relativePathSegments: Array<string>): string {
  return path.resolve(__dirname, "..", ...relativePathSegments);
}

describe("validate", () => {
  it("can check syntax for a valid block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/simple.block.css")]);
    assert.equal(cli.output, `ok\t${relFixture("basic/simple.block.css")}\n`);
    assert.equal(cli.exitCode, 0);
  });
  it("can check syntax for a bad block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/error.block.css")]);
    assert.equal(cli.output, `error\t${relFixture("basic/error.block.css")}:1:5 Two distinct classes cannot be selected on the same element: .foo.bar\n`);
    assert.equal(cli.exitCode, 1);
  });
  it("correctly displays errors in referenced blocks.", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/transitive-error.block.css")]);
    assert.equal(cli.output, `error\t${relFixture("basic/error.block.css")}:1:5 Two distinct classes cannot be selected on the same element: .foo.bar\n`);
    assert.equal(cli.exitCode, 1);
  });
});

describe("validate with preprocessors", () => {
  it("can check syntax for a valid block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", "--preprocessors", distFile("test/preprocessors"), fixture("scss/simple.block.scss")]);
    assert.equal(cli.output, `ok\t${relFixture("scss/simple.block.scss")}\n`);
    assert.equal(cli.exitCode, 0);
  });
  it("can check syntax for a bad block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", "--preprocessors", distFile("test/preprocessors"), fixture("scss/error.block.scss")]);
    assert.equal(cli.output, `error\t${relFixture("scss/error.block.scss")}:5:5 Two distinct classes cannot be selected on the same element: .foo.bar\n`);
    assert.equal(cli.exitCode, 1);
  });
});
