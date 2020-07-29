import { assert } from "chai";
import { readFileSync, readJsonSync } from "fs-extra";
import { suite, test } from "mocha-typescript";
import { join } from "path";

import * as cssBlocks from "../../src";
import { CssBlockError } from "../../src";
import { MockImportRegistry } from "../util/MockImportRegistry";
import { setupImporting } from "../util/setupImporting";

const fixtureDir = "test/fixtures/BlockFactoryCompiledCssFiles/basic";
const navCssPath = "foo/bar/nav.css";
const navCssFixture = readFileSync(join(fixtureDir, "nav.css"), { encoding: "utf8" });
const navDfnPath = "foo/bar/nav.blockdef.css";
const navDfnFixture = readFileSync(join(fixtureDir, "nav.blockdef.css"), { encoding: "utf8" });
const expectedProperties = readJsonSync(join(fixtureDir, "expectedProperties.json"), { encoding: "utf8" });
const otherCssPath = "foo/bar/other.css";
const otherCssFixture = readFileSync(join(fixtureDir, "other.css"), { encoding: "utf8" });
const otherDfnPath = "foo/bar/other.blockdef.css";
const otherDfnFixture = readFileSync(join(fixtureDir, "other.blockdef.css"), { encoding: "utf8" });

function registerCompiledCssFixture(
  importRegistry: MockImportRegistry,
  cssContents = navCssFixture,
  dfnContents = navDfnFixture,
  cssPath = navCssPath,
  dfnPath = navDfnPath,
) {
  importRegistry.registerCompiledCssSource(cssPath, cssContents, dfnPath, dfnContents);
}

@suite("Block Factory - Compiled CSS File Processing - Basic Tests")
export class BlockFactoryCompiledCssFilesTests {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: Promise<unknown>) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test "Can import a Compiled CSS file"() {
    let { imports, importer, config, factory } = setupImporting();
    imports.registerCompiledCssSource(navCssPath, navCssFixture, navDfnPath, navDfnFixture);

    const expectedFoundClasses = Object.keys(expectedProperties);

    return factory.getBlock(importer.identifier(null, navCssPath, config)).then(block => {
      const foundClasses = block.presetClassesMap(true);
      assert.deepEqual(
        Object.keys(foundClasses),
        expectedFoundClasses,
        "Class nodes on map matches expected list of classes",
      );

      expectedFoundClasses.forEach(expectedClass => {
        Object.keys(expectedProperties[expectedClass]).forEach(psuedo => {
          assert.deepEqual(
            [...foundClasses[expectedClass].rulesets.getProperties(psuedo)].sort(),
            expectedProperties[expectedClass][psuedo].sort(),
            `Properties on class node ${expectedClass}${psuedo} match expected list`,
          );
        });
      });
    });
  }

  @test "Adds error if block-syntax-version is not declared"() {
    let { imports, importer, config, factory } = setupImporting();
    const brokenDfnFileContents = navDfnFixture.replace("@block-syntax-version 1;", "");
    registerCompiledCssFixture(imports, undefined, brokenDfnFileContents);

    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Unable to process definition file because the file is missing a block-syntax-version declaration or it is malformed. (foo/bar/nav.blockdef.css)",
      factory.getBlock(importer.identifier(null, navCssPath, config)),
    );
  }

  @test "Adds error if block-syntax-version value is not a number"() {
    let { imports, importer, config, factory } = setupImporting();
    const brokenDfnFileContents = navDfnFixture.replace("@block-syntax-version 1;", "@block-syntax-version not-a-number;");
    registerCompiledCssFixture(imports, undefined, brokenDfnFileContents);

    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Unable to process definition file because the declared block-syntax-version isn't a number. (foo/bar/nav.blockdef.css)",
      factory.getBlock(importer.identifier(null, navCssPath, config)),
    );
  }

  @test "Adds error if block-syntax-version is later than version 1"() {
    let { imports, importer, config, factory } = setupImporting();
    const brokenDfnFileContents = navDfnFixture.replace("@block-syntax-version 1;", "@block-syntax-version 9001;");
    registerCompiledCssFixture(imports, undefined, brokenDfnFileContents);

    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Unable to process definition file because the syntax version of the definition file is greater than supported by CSS Blocks. You can fix this issue by upgrading CSS Blocks to the latest version. (foo/bar/nav.blockdef.css)",
      factory.getBlock(importer.identifier(null, navCssPath, config)),
    );
  }

  @test "Adds error if block-syntax-version is earlier than version 1"() {
    let { imports, importer, config, factory } = setupImporting();
    const brokenDfnFileContents = navDfnFixture.replace("@block-syntax-version 1;", "@block-syntax-version 0;");
    registerCompiledCssFixture(imports, undefined, brokenDfnFileContents);

    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Unable to process definition file because the syntax of the definition can't be automatically upgraded to the latest version supported by CSS Blocks. You may be able to fix this issue by upgrading the dependency or origin file this definition file was generated from. Otherwise, you'll need to use an earlier version of CSS Blocks. (foo/bar/nav.blockdef.css)",
      factory.getBlock(importer.identifier(null, navCssPath, config)),
    );
  }

  @test("Adds error if GUID has been used previously")
  async testGuidConflict() {
    let { imports, importer, config, factory } = setupImporting();
    registerCompiledCssFixture(imports, undefined, navDfnFixture);

    const brokenOtherCssFixture = otherCssFixture.replace("/*#css-blocks abc12*/", "/*#css-blocks 7d97e*/");
    const brokenOtherDfnFixture = otherDfnFixture.replace("block-id: abc12;", "block-id: 7d97e;");
    registerCompiledCssFixture(imports, brokenOtherCssFixture, brokenOtherDfnFixture, otherCssPath, otherDfnPath);

    await factory.getBlock(importer.identifier(null, navCssPath, config));
    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Block uses a GUID that has already been used! Check dependencies for conflicting GUIDs and/or increase the number of significant characters used to generate GUIDs. (foo/bar/other.css)",
      factory.getBlock(importer.identifier(null, otherCssPath, config)),
    );
  }

  @test("Adds error if name has been used previously")
  async testNameConflict() {
    let { imports, importer, config, factory } = setupImporting();
    registerCompiledCssFixture(imports, undefined, navDfnFixture);

    const brokenOtherCssFixture = otherCssFixture.replace(".other-abc12", ".nav-abc12");
    const brokenOtherDfnFixture = otherDfnFixture.replace("block-name: other;", "block-name: nav;").replace("block-class: other-abc12;", "block-class: nav-abc12;");
    registerCompiledCssFixture(imports, brokenOtherCssFixture, brokenOtherDfnFixture, otherCssPath, otherDfnPath);

    await factory.getBlock(importer.identifier(null, navCssPath, config));
    return this.assertError(
      CssBlockError,
      "[css-blocks] Error: Block uses a name that has already been used by foo/bar/nav.css (foo/bar/other.css)",
      factory.getBlock(importer.identifier(null, otherCssPath, config)),
    );
  }
}
