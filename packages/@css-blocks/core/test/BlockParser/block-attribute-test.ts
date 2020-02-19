// import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertMultipleErrorsRejection } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { MockImportRegistry } from "../util/MockImportRegistry";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("Block Attributes")
export class BlockAttributesTest extends BEMProcessor {

  @test "An attribute cannot be named 'scope'"() {
    let imports = new MockImportRegistry();

    let filename = "foo/bar/test-block.css";
    let inputCSS = `:scope[scope] { color: red; }`;

    return assertMultipleErrorsRejection(
      [{
        type: InvalidBlockSyntax,
        message: `A state cannot be named 'scope'. (foo/bar/test-block.css:1:7)`,
      }],
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }
}
