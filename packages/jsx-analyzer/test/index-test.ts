import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import parser from "../src/index";

@suite("Example Test")
export class Test {
  @test "tests run"() {
    assert.equal(1, 1);
  }

  @test "parser parses"(){
    parser({
      string: `class Foo {
        method(){
          console.log(1);
        }
      }`
    });
  }
}
