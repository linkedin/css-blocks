import assert = require("assert");
import { TempDir, createTempDir } from "broccoli-test-helper";
import { chdir, cwd } from "process";

import { TestCLI as CLI } from "./TestCLI";

const WORKING_DIR = cwd();

describe("BEM converter", () => {
  let tempDir: TempDir | undefined;

  afterEach(async () => {
    chdir(WORKING_DIR);
    if (tempDir) {
      await tempDir.dispose();
    }
  });
  it("can convert a bem file.", async () => {
    tempDir = await createTempDir();
    tempDir.write({
      "nav.css": `
        .nav { }
        .nav--open { }
        .nav__item { }
        .nav__item--is-selected { }
      `,
    });
    chdir(tempDir.path());
    let cli = new CLI();
    await cli.run(["convert", "nav.css"]);
    assert.equal(cli.exitCode, 0);
    assert.equal(cli.output.trim(), ``);
    let result = tempDir.read();
    let convertedFileContents = result["nav.block.css"];
    assert.ok(typeof convertedFileContents === "string" && convertedFileContents.match(/:scope/));
  });
});
