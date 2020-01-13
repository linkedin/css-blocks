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
    console.log(cli.output);
    assert.equal(cli.output,
                 `error\t${relFixture("basic/error.block.css")}
\tTwo distinct classes cannot be selected on the same element: .foo.bar
\tAt ${relFixture("basic/error.block.css")}:1:5
\t1: .foo.bar {
\t2:   color: red;
Found 1 error in 1 file.
`);
    assert.equal(cli.exitCode, 1);
  });
  it("correctly displays errors in referenced blocks.", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("basic/transitive-error.block.css")]);

    assert.equal(cli.output,
                 `error\t${relFixture("basic/transitive-error.block.css")}
\tTwo distinct classes cannot be selected on the same element: .foo.bar
\tAt ${relFixture("basic/error.block.css")}:1:5
\t1: .foo.bar {
\t2:   color: red;
error\t${relFixture("basic/transitive-error.block.css")}
\tNo Block named "error" found in scope.
\tAt ${relFixture("basic/transitive-error.block.css")}:4:3
\t3: :scope {
\t4:   extends: error;
\t5: }
Found 2 errors in 1 file.
`);
    assert.equal(cli.exitCode, 2);
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
    assert.equal(cli.output, `error	test/fixtures/scss/error.block.scss
\tTwo distinct classes cannot be selected on the same element: .foo.bar
\tAt compiled output of test/fixtures/scss/error.block.scss:5:5
\t4:
\t5: .foo.bar {
\t6:   color: blue;
\tSource Mapped to test/fixtures/scss/error.block.scss:3:5
\t2:
\t3: .foo {
\t4:   color: red;
Found 1 error in 1 file.
`);
    assert.equal(cli.exitCode, 1);
  });
  it("can check syntax for a style lookup failure", async () => {
    let cli = new CLI();
    await cli.run(["validate", "--preprocessors", distFile("test/preprocessors"), fixture("scss/missing-style.block.scss")]);
    assert.equal(cli.output, `error\ttest/fixtures/scss/missing-style.block.scss
\tNo style "simple[light]" found.
\tAt compiled output of test/fixtures/scss/missing-style.block.scss:3:3
\t2: .composer {
\t3:   composes: "simple[light]";
\t4:   color: blue;
\tSource Mapped to test/fixtures/scss/missing-style.block.scss:4:3
\t3: .composer {
\t4:   composes: "simple[light]";
\t5:   color: blue;
Found 1 error in 1 file.
`);
    assert.equal(cli.exitCode, 1);
  });
});

describe("validate with config file", () => {
  it("can check syntax for a valid block file", async () => {
    let cli = new CLI();
    await cli.run(["validate", fixture("config-file/simple.block.scss")]);
    assert.equal(cli.output, `ok\t${relFixture("config-file/simple.block.scss")}\n`);
    assert.equal(cli.exitCode, 0);
  });
});
