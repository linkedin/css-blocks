import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { isDefinitionUrlValid } from "../../src/PrecompiledDefinitions/compiled-comments";

@suite("PrecompiledDefinitions/compiled-comments")
export class CompiledCommentsTests {

  @test "isDefinitionUrlValid > Reports encoded base64 data is ok"() {
    const testInput = "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==";
    assert.ok(isDefinitionUrlValid(testInput));
  }

  @test "isDefinitionUrlValid > Reports relative path is ok"() {
    const testInput = "../../path/to/definition.block.dfn";
    assert.ok(isDefinitionUrlValid(testInput));
  }

  @test "isDefinitionUrlValid > Reports absolute Unix path is invalid"() {
    const testInput = "/path/to/definition.blockdfn.css";
    assert.notOk(isDefinitionUrlValid(testInput));
  }

  @test "isDefinitionUrlValid > Reports absolute Windows path is invalid"() {
    const testInput = "C:\\path\\to\\definition.blockdfn.css";
    assert.notOk(isDefinitionUrlValid(testInput));
  }

  @test "isDefinitionUrlValid > Reports URL with non-data protocol is invalid"() {
    const testInput = "https://css-blocks.com/";
    assert.notOk(isDefinitionUrlValid(testInput));
  }

}
