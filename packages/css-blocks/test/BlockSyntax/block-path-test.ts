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

  @test "finds the block with a namespace"() {
    let path = new BlockPath("block[state|my-attr]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ":scope[state|my-attr]");
  }

  @test "finds the block and class with a namespace"() {
    let path = new BlockPath("block.class[state|my-attr]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-attr]");
  }

  @test "finds a namespaced attribute with value"() {
    let path = new BlockPath("[state|my-attr=value]");
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-attr="value"]`);
  }

  @test "finds a namespace with value in single quotes"() {
    let path = new BlockPath("[state|my-attr='my value']");
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-attr="my value"]`);
  }

  @test "finds a namespace with value in double quotes"() {
    let path = new BlockPath(`[state|my-attr="my value"]`);
    assert.equal(path.block, "");
    assert.equal(path.path, `:scope[state|my-attr="my value"]`);
  }

  @test "finds a class with a namespace and value"() {
    let path = new BlockPath(".class[state|my-attr=value]");
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-attr="value"]`);
  }

  @test "finds a class with a namespace and value in single quotes"() {
    let path = new BlockPath(".class[state|my-attr='my value']");
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-attr="my value"]`);
  }

  @test "finds a class with a namespace and value in double quotes"() {
    let path = new BlockPath(`.class[state|my-attr="my value"]`);
    assert.equal(path.block, "");
    assert.equal(path.path, `.class[state|my-attr="my value"]`);
  }

  @test "finds the block with a class, namespace and value"() {
    let path = new BlockPath("block.class[state|my-attr=value]");
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-attr="value"]`);
  }

  @test "finds the block with a class, namespace and value in single quotes"() {
    let path = new BlockPath("block.class[state|my-attr='my value']");
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-attr="my value"]`);
  }

  @test "finds the block with a class, namespace and value in double quotes"() {
    let path = new BlockPath(`block.class[state|my-attr="my value"]`);
    assert.equal(path.block, "block");
    assert.equal(path.path, `.class[state|my-attr="my value"]`);
  }

  @test "finds :scope when passed empty string"() {
    let path = new BlockPath("");
    assert.equal(path.block, "");
    assert.equal(path.path, ":scope");
    assert.equal(path.attribute, undefined);
  }

  @test "parentPath returns the parent's path"() {
    let path = new BlockPath("block.class[state|my-attr]");
    assert.equal(path.parentPath().toString(), "block.class");
    path = new BlockPath(".class[state|my-attr]");
    assert.equal(path.parentPath().toString(), ".class");
    path = new BlockPath("block.class");
    assert.equal(path.parentPath().toString(), "block");
    path = new BlockPath("block[state|my-attr]");
    assert.equal(path.parentPath().toString(), "block:scope");
  }

  @test "childPath returns the child's path"() {
    let path = new BlockPath("block.class[state|my-attr]");
    assert.equal(path.childPath().toString(), ".class[state|my-attr]");
    path = new BlockPath(".class[state|my-attr]");
    assert.equal(path.childPath().toString(), "[state|my-attr]");
    path = new BlockPath("block.class");
    assert.equal(path.childPath().toString(), ".class");
    path = new BlockPath("block[state|my-attr]");
    assert.equal(path.childPath().toString(), ":scope[state|my-attr]");
  }

  @test "sub-path properties return expected values"() {
    let path = new BlockPath("block.class[state|my-attr]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-attr]");
    assert.equal(path.class, "class");
    assert.equal(path.attribute && path.attribute.namespace, "state");
    assert.equal(path.attribute && path.attribute.name, "my-attr");

    path = new BlockPath("block[state|my-attr=foobar]");
    assert.equal(path.block, "block");
    assert.equal(path.path, `:scope[state|my-attr="foobar"]`);
    assert.equal(path.class, ":scope");
    // assert.equal(path.namespace && path.namespace.namespace, "namespace");
    assert.equal(path.attribute && path.attribute.namespace, "state");
    assert.equal(path.attribute && path.attribute.name, "my-attr");
    assert.equal(path.attribute && path.attribute.value, "foobar");
  }

  @test "mismatched namespace value quotes throw"() {
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

  @test "whitespace outside of quoted namespace values throws"() {
    assert.throws(
      () => {
        parseBlockPath(`block. class`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my namespace]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[my state|my-attr]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my-attr=my value]`);
      },
      ERRORS.whitespace);
    assert.throws(
      () => {
        parseBlockPath(`[state|my-attr=my\nvalue]`);
      },
      ERRORS.whitespace);
  }

  @test "namespaces are required to be valid strings (currently only `state`)"() {
    parseBlockPath(`[state|name=value]`);

    assert.throws(
      () => {
        parseBlockPath(`[|name=value]`);
      },
      ERRORS.namespace);
    assert.throws(
      () => {
        parseBlockPath(`[namespace|name=value]`);
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

  @test "Illegal characters outside of namespace segments throw"() {
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

  @test "Illegal characters inside of namespaced attribute segments throw"() {
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

  @test "Unterminated namespace attribute selectors throw"() {
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
    let path = new BlockPath(`block[state|foo="1bar"]`);
    assert.equal(path.attribute && path.attribute.namespace, "state");
    assert.equal(path.attribute && path.attribute.name, "foo");
    assert.equal(path.attribute && path.attribute.value, "1bar");
  }

  @test @skip "escaped illegal characters in identifiers are processed"() {
    parseBlockPath(`block\+name`);
    parseBlockPath(`block[\#name|foo=bar]`);
    parseBlockPath(`block[name|fo\&o=bar]`);
  }

}
