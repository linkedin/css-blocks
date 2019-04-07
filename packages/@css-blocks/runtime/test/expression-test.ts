import { assert } from "chai";
import { suite, test } from "mocha-typescript";

@suite("Expression")
export class ExpressionTests {
  @test "runs"() {
    assert.equal(1, 1);
  }
}
