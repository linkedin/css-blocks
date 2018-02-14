import { assert } from "chai";
import { suite, test, only, skip } from "mocha-typescript";

import { BlockPath, ERRORS } from "../../src/BlockSyntax";

@suite("Block Path Parser")
export class BlockPathTests {
  @test "finds the block"() {
    let path = new BlockPath("block");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".root");
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
    assert.equal(path.path, "[state|my-state]");
  }

  @test "finds the block and class with a state"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-state]");
  }

  @test "finds a a state with value"() {
    let path = new BlockPath("[state|my-state=value]");
    assert.equal(path.block, "");
    assert.equal(path.path, `[state|my-state="value"]`);
  }

  @test "finds a state with value in single quotes"() {
    let path = new BlockPath("[state|my-state='my value']");
    assert.equal(path.block, "");
    assert.equal(path.path, `[state|my-state="my value"]`);
  }

  @test "finds a state with value in double quotes"() {
    let path = new BlockPath(`[state|my-state="my value"]`);
    assert.equal(path.block, "");
    assert.equal(path.path, `[state|my-state="my value"]`);
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

  @test "parentPath returns the parent's path"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.parentPath().toString(), "block.class");
    path = new BlockPath(".class[state|my-state]");
    assert.equal(path.parentPath().toString(), ".class");
    path = new BlockPath("block.class");
    assert.equal(path.parentPath().toString(), "block");
    path = new BlockPath("block[state|my-state]");
    assert.equal(path.parentPath().toString(), "block");
  }

  @test "childPath returns the child's path"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.childPath().toString(), ".class[state|my-state]");
    path = new BlockPath(".class[state|my-state]");
    assert.equal(path.childPath().toString(), "[state|my-state]");
    path = new BlockPath("block.class");
    assert.equal(path.childPath().toString(), ".class");
    path = new BlockPath("block[state|my-state]");
    assert.equal(path.childPath().toString(), "[state|my-state]");
  }

  @test "sub-path properties return expected values"() {
    let path = new BlockPath("block.class[state|my-state]");
    assert.equal(path.block, "block");
    assert.equal(path.path, ".class[state|my-state]");
    assert.equal(path.class, "class");
    // assert.equal(path.state && path.state.namespace, "state");
    assert.equal(path.state && path.state.name, "my-state");

    path = new BlockPath("block[state|my-state=foobar]");
    assert.equal(path.block, "block");
    assert.equal(path.path, `[state|my-state="foobar"]`);
    assert.equal(path.class, "root");
    // assert.equal(path.state && path.state.namespace, "state");
    assert.equal(path.state && path.state.group, "my-state");
    assert.equal(path.state && path.state.name, "foobar");
  }

  @test "mismatched State value quotes throw"() {
    assert.throws(() => {
      let path = new BlockPath(`.class[state|name="value']`);
    }, ERRORS.mismatchedQuote);
    assert.throws(() => {
      let path = new BlockPath(`.class[state|name='value"]`);
    }, ERRORS.mismatchedQuote);
  }

  @test "duplicate selector types in the same path throw"() {
    assert.throws(() => {
      let path = new BlockPath(`block.class.class`);
    }, ERRORS.multipleOfType('class'));
    assert.throws(() => {
      let path = new BlockPath(`block[state|foo][state|bar]`);
    }, ERRORS.multipleOfType('state'));
  }

  @test "whitespace outside of quoted state values throws"() {
    assert.throws(() => {
      let path = new BlockPath(`block. class`);
    }, ERRORS.whitespace);
    assert.throws(() => {
      let path = new BlockPath(`[state|my state]`);
    }, ERRORS.whitespace);
    assert.throws(() => {
      let path = new BlockPath(`[my namespace|my-state]`);
    }, ERRORS.whitespace);
    assert.throws(() => {
      let path = new BlockPath(`[state|my-state=my value]`);
    }, ERRORS.whitespace);
    assert.throws(() => {
      let path = new BlockPath(`[state|my-state=my\nvalue]`);
    }, ERRORS.whitespace);
  }

  @test "states are required to have namespaces"() {
    let path = new BlockPath(`[namespace|name=value]`);

    assert.throws(() => {
      let path = new BlockPath(`[|name=value]`);
    }, ERRORS.namespace);
    assert.throws(() => {
      let path = new BlockPath(`[name=value]`);
    }, ERRORS.namespace);
  }

  @test "separator token required after path termination"() {
    assert.throws(() => {
      let path = new BlockPath(`[state|name=value]class`);
    }, ERRORS.expectsSepInsteadRec('c'));
    assert.throws(() => {
      let path = new BlockPath(`[state|name=value]]`);
    }, ERRORS.expectsSepInsteadRec(']'));
  }

  @test "Style path segments require names"() {
    assert.throws(() => {
      let path = new BlockPath(`block.[state|name=value]`);
    }, ERRORS.noname);
    assert.throws(() => {
      let path = new BlockPath(`block.class[state|]`);
    }, ERRORS.noname);
    assert.throws(() => {
      let path = new BlockPath(`block.class[state|=value]`);
    }, ERRORS.noname);
  }

  @test "Illegal characters outside of state segments throw"() {
    assert.throws(() => {
      let path = new BlockPath(`block.cla|ss`);
    }, ERRORS.illegalCharNotInState(`|`));
    assert.throws(() => {
      let path = new BlockPath(`block.cla=ss`);
    }, ERRORS.illegalCharNotInState(`=`));
    assert.throws(() => {
      let path = new BlockPath(`block.cla"ss`);
    }, ERRORS.illegalCharNotInState(`"`));
    assert.throws(() => {
      let path = new BlockPath(`block.cla'ss`);
    }, ERRORS.illegalCharNotInState(`'`));
    assert.throws(() => {
      let path = new BlockPath(`block.cla]ss`);
    }, ERRORS.illegalCharNotInState(`]`));
  }

  @test "Illegal characters inside of state segments throw"() {
    assert.throws(() => {
      let path = new BlockPath(`[state|val.ue]`);
    }, ERRORS.illegalCharInState(`.`));
    assert.throws(() => {
      let path = new BlockPath(`[state|val[ue]`);
    }, ERRORS.illegalCharInState(`[`));
  }

  @test "Unterminated state selectors throw"() {
    assert.throws(() => {
      let path = new BlockPath(`[state|name`);
    }, ERRORS.unclosedState);
    assert.throws(() => {
      let path = new BlockPath(`[state|name=value`);
    }, ERRORS.unclosedState);
  }

  @test "unescaped illegal characters in identifiers throw."() {
    assert.throws(() => {
      let path = new BlockPath(`block+name`);
    }, ERRORS.illegalChar('+'));
    assert.throws(() => {
      let path = new BlockPath(`block[#name|foo=bar]`);
    }, ERRORS.illegalChar('#'));
    assert.throws(() => {
      let path = new BlockPath(`block[name|fo&o=bar]`);
    }, ERRORS.illegalChar('&'));
    assert.throws(() => {
      let path = new BlockPath(`block[name|foo=1bar]`);
    }, ERRORS.illegalChar('1'));

    // Quoted values may have illegal strings
    let path = new BlockPath(`block[name|foo="1bar"]`);
    assert.equal(path.state && path.state.name, "1bar");
  }

  @test @skip "escaped illegal characters in identifiers are processed"() {
    let path = new BlockPath(`block\+name`);
    path = new BlockPath(`block[\#name|foo=bar]`);
    path = new BlockPath(`block[name|fo\&o=bar]`);
  }

}
