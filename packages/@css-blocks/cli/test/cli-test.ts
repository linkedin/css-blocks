import assert = require("assert");
import path = require("path");
import { chdir, cwd } from "process";

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

const WORKING_DIR = cwd();
describe("validate", () => {
  afterEach(() => {
    chdir(WORKING_DIR);
  });
  it("can check syntax for a valid block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/simple.block.css")]);
    assert.equal(cli.output, `ok\t${relFixture("basic/simple.block.css")}\n`);
    assert.equal(cli.exitCode, 0);
  });
  it("can check syntax for a bad block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/error.block.css")]);
    assert.equal(cli.output,
                 `error\t${relFixture("basic/error.block.css")}
\tAt ${relFixture("basic/error.block.css")}:1:5 Two distinct classes cannot be selected on the same element: .foo.bar
\t1: .foo.bar {
\t2:   color: red;
\t3: }
Found 1 error in 1 file.
`);
    assert.equal(cli.exitCode, 1);
  });
  it("correctly displays errors in referenced blocks.", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/transitive-error.block.css")]);
    assert.equal(cli.output,
                 `error\t${relFixture("basic/transitive-error.block.css")}
\tAt ${relFixture("basic/error.block.css")}:1:5 Two distinct classes cannot be selected on the same element: .foo.bar
\t1: .foo.bar {
\t2:   color: red;
\t3: }
Found 1 error in 1 file.
`);
    assert.equal(cli.exitCode, 1);
  });
  it("can import from node_modules", async () => {
    chdir(fixture("importing"));
    let cli = new CLI();
    await cli.run(["validate", "--npm", "npm.block.css"]);
    assert.equal(cli.output, `ok\tnpm.block.css\n`);
    assert.equal(cli.exitCode, 0);
  });
  it("can import with aliases", async () => {
    chdir(fixture("importing"));
    let cli = new CLI();
    await cli.run(["validate", "--npm", "--alias", "basic", "../basic", "alias.block.css"]);
    assert.equal(cli.output, `ok\talias.block.css\n`);
    assert.equal(cli.exitCode, 0);
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
    assert.equal(cli.output.split(/\n/)[1].trim(), `At ${relFixture("scss/error.block.scss")}:5:5 Two distinct classes cannot be selected on the same element: .foo.bar`);
    assert.equal(cli.exitCode, 1);
  });
});
