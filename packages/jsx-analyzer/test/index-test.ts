import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { parse, parseFile} from "../src/index";

var mock = require('mock-fs');

@suite("Parser Test")
export class Test {

  @test "parses when provided a string"(){
    return parse(`
      class Foo {
        method(){
          console.log(1);
        }
      }
    `).then((analysis) => {
      mock.restore();
      assert.ok(analysis);
    });
  }

  @test "parses when provided a path"(){
    mock({
      "bar.js": `class Foo {
        method(){
          console.log(1);
        }
      }`,
    });
    return parseFile('bar.js').then((analysis) => {
      mock.restore();
      assert.ok(analysis);
    });
  }

  @test "parser takes an optional options hash with baseDir"(){
    mock({
      "/foo/baz/bar.js": `class Foo {
        method(){
          console.log(1);
        }
      }`,
    });
    return parseFile('bar.js', { baseDir: '/foo/baz'}).then((analysis) => {
      mock.restore();
      assert.ok(analysis);
    });
  }
}
