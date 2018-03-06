import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";

import { BlockPath, ERRORS } from "../../src/BlockSyntax";
import { ErrorLocation } from "../../src/errors";

function parseBlockPath(blockPath: string, loc?: ErrorLocation): BlockPath {
  return new BlockPath(blockPath, loc);
}

@suite("Block Path Parser")
export class BlockPathTests {
  @test "finds the block"() {
    let path = new BlockPath("block");
    assert.equal(path.block, "block");
    assert.equal(path.path, ":scope");
  }

  @test "finds the class"() {
    let path = new BlockPath(".test");
    assert.equal(path.block, "");
    assert.equal(path.path, ".test");
  }

  @test "finds the block and class"() {
    let path = new BlockPath("block.class");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class");
  }

  @test "finds the block with a state"() {
    let path = new BlockPath("block[state|my-state]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ":scope[state|my-state]");
  }

  @test "finds the block and class with a state"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-state]");
  }

  @test "finds a a state with value"() {
    let path = new BlockPath("[state|my-state=value]");
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-state="value"]`);
  }

  @test "finds a state with value in single quotes"() {
    let path = new BlockPath("[state|my-state='my value']");
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-state="my value"]`);
  }

  @test "finds a state with value in double quotes"() {
    let path = new BlockPath(`[state|my-state="my value"]`);
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-state="my value"]`);
  }

  @test "finds a class with a state and value"() {
    let path = new BlockPath(".class[state|my-state=value]");
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-state="value"]`);
  }

  @test "finds a class with a state and value in single quotes"() {
    let path = new BlockPath(".class[state|my-state='my value']");
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-state="my value"]`);
  }

  @test "finds a class with a state and value in double quotes"() {
    let path = new BlockPath(`.class[state|my-state="my value"]`);
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-state="my value"]`);
  }

  @test "finds the block with a class, state and value"() {
    let path = new BlockPath("block.class[state|my-state=value]");
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-state="value"]`);
  }

  @test "finds the block with a class, state and value in single quotes"() {
    let path = new BlockPath("block.class[state|my-state='my value']");
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-state="my value"]`);
  }

  @test "finds the block with a class, state and value in double quotes"() {
    let path = new BlockPath(`block.class[state|my-state="my value"]`);
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-state="my value"]`);
  }

  @test "finds :scope when passed empty string"() {
    let path = new BlockPath("");
    assert.equal(path.block, "");
    assert.equal(path.path, ":scope");
    assert.equal(path.attribute, undefined);
  }

  @test "parentPath returns the parent's path"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.parentPath().toString(), "block.class");
    path = new BlockPath(".class[state|my-state]");
    assert.equal(path.parentPath().toString(), ".class");
    path = new BlockPath("block.class");
    assert.equal(path.parentPath().toString(), "block");
    path = new BlockPath("block[state|my-state]");
    assert.equal(path.parentPath().toString(), "block:scope");
  }

  @test "childPath returns the child's path"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.childPath().toString(), ".class[state|my-state]");
    path = new BlockPath(".class[state|my-state]");
    assert.equal(path.childPath().toString(), "[state|my-state]");
    path = new BlockPath("block.class");
    assert.equal(path.childPath().toString(), ".class");
    path = new BlockPath("block[state|my-state]");
    assert.equal(path.childPath().toString(), ":scope[state|my-state]");
  }

  @test "sub-path properties return expected values"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-state]");
    assert.equal(path.class, "class");
    assert.equal(path.attribute && path.attribute.namespace, "state");
    assert.equal(path.attribute && path.attribute.name, "my-state");

    path = new BlockPath("block[state|my-state=foobar]");
    assert.equal(path.block, "block");
    assert.equal(path.path, `:scope[state|my-state="foobar"]`);
    assert.equal(path.class, ":scope");
    // assert.equal(path.state && path.state.namespace, "state");
    assert.equal(path.attribute && path.attribute.namespace, "state");
    assert.equal(path.attribute && path.attribute.name, "my-state");
    assert.equal(path.attribute && path.attribute.value, "foobar");
  }

  @test "mismatched State value quotes throw"() {
    assert.throws(
      () => {
        parseBlockPath(`.class[state|name="value']`);
      },
      ERRORS.mismatchedQuote);

    assert.throws(
      () => {
        parseBlockPath(`.class[state|name='value"]`);
      },
      ERRORS.mismatchedQuote);
  }

  @test "duplicate selector types in the same path throw"() {
    assert.throws(
      () => {
        parseBlockPath(`block.class.class`);
      },
      ERRORS.multipleOfType("class"));

    assert.throws(
      () => {
        parseBlockPath(`block[state|foo][state|bar]`);
      },
      ERRORS.multipleOfType("attribute"));
  }

  @test "whitespace outside of quoted state values throws"() {
    assert.throws(
      () => {
        parseBlockPath(`block. class`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my state]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[my namespace|my-state]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my-state=my value]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my-state=my\nvalue]`);
      },
      ERRORS.whitespace);
  }

  @test "states are required to have namespaces"() {
    parseBlockPath(`[namespace|name=value]`);

    assert.throws(
      () => {
        parseBlockPath(`[|name=value]`);
      },
      ERRORS.namespace);
    assert.throws(
      () => {
        parseBlockPath(`[name=value]`);
      },
      ERRORS.namespace);
  }

  @test "separator token required after path termination"() {
    assert.throws(
      () => {
        parseBlockPath(`[state|name=value]class`);
      },
      ERRORS.expectsSepInsteadRec("c"));
    assert.throws(
      () => {
        parseBlockPath(`[state|name=value]]`);
      },
      ERRORS.expectsSepInsteadRec("]"));
  }

  @test "Style path segments require names"() {
    assert.throws(
      () => {
        parseBlockPath(`block.[state|name=value]`);
      },
      ERRORS.noname);
    assert.throws(
      () => {
        parseBlockPath(`block.class[state|]`);
      },
      ERRORS.noname);
    assert.throws(
      () => {
        parseBlockPath(`block.class[state|=value]`);
      },
      ERRORS.noname);
  }

  @test "Illegal characters outside of state segments throw"() {
    assert.throws(
      () => {
        parseBlockPath(`block.cla|ss`);
      },
      ERRORS.illegalCharNotInAttribute(`|`));
    assert.throws(
      () => {
        parseBlockPath(`block.cla=ss`);
      },
      ERRORS.illegalCharNotInAttribute(`=`));
    assert.throws(
      () => {
        parseBlockPath(`block.cla"ss`);
      },
      ERRORS.illegalCharNotInAttribute(`"`));
    assert.throws(
      () => {
        parseBlockPath(`block.cla` + `'ss`);
      },
      ERRORS.illegalCharNotInAttribute(`'`));
    assert.throws(
      () => {
        parseBlockPath(`block.cla]ss`);
      },
      ERRORS.illegalCharNotInAttribute(`]`));
  }

  @test "Illegal characters inside of state segments throw"() {
    assert.throws(
      () => {
        parseBlockPath(`[state|val.ue]`);
      },
      ERRORS.illegalCharInAttribute(`.`));
    assert.throws(
      () => {
        parseBlockPath(`[state|val[ue]`);
      },
      ERRORS.illegalCharInAttribute(`[`));
  }

  @test "Unterminated state selectors throw"() {
    assert.throws(
      () => {
        parseBlockPath(`[state|name`);
      },
      ERRORS.unclosedAttribute);
    assert.throws(
      () => {
        parseBlockPath(`[state|name=value`);
      },
      ERRORS.unclosedAttribute);
  }

  @test "unescaped illegal characters in identifiers throw."() {
    let loc = {
      filename: "foo.scss",
      line: 10,
      column: 20,
    };
    assert.throws(
      () => {
        parseBlockPath(`block+name`, loc);
      },
      `${ERRORS.invalidIdent("block+name")} (foo.scss:10:21)`);
    assert.throws(
      () => {
        parseBlockPath(`block[#name|foo=bar]`, loc);
      },
      `${ERRORS.invalidIdent("#name")} (foo.scss:10:27)`);
    assert.throws(
      () => {
        parseBlockPath(`block[name|fo&o=bar]`, loc);
      },
      `${ERRORS.invalidIdent("fo&o")} (foo.scss:10:32)`);
    assert.throws(
      () => {
        parseBlockPath(`block[name|foo=1bar]`, loc);
      },
      `${ERRORS.invalidIdent("1bar")} (foo.scss:10:36)`);

    // Quoted values may have illegal strings
    let path = new BlockPath(`block[name|foo="1bar"]`);
    assert.equal(path.attribute && path.attribute.namespace, "name");
    assert.equal(path.attribute && path.attribute.name, "foo");
    assert.equal(path.attribute && path.attribute.value, "1bar");
  }

  @test @skip "escaped illegal characters in identifiers are processed"() {
    parseBlockPath(`block\+name`);
    parseBlockPath(`block[\#name|foo=bar]`);
    parseBlockPath(`block[name|fo\&o=bar]`);
  }

}
