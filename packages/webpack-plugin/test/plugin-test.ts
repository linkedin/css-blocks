import { suite, test, skip } from "mocha-typescript";
import execTest from "./util/execTest";
// import { assert } from "chai";

// import assertError from "./util/assertError";
// import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Plugin")
export class PluginTest {
  @skip
  @test "skipped on purpose"() {

  }
  @test "compiles a css block"() {
    return execTest("hello");
  }
  @test "compiles a css block with a reference"() {
    return execTest("has-reference");
  }
}
