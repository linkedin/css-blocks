import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

@suite("Local Scope lookup")
export class LocalScopeLookupTest extends BEMProcessor {

  @test "can look up a local object"() {
    let { importer, config, factory } = setupImporting();
    let filename = "foo/bar/a-block.css";
    importer.registerSource(
      filename,
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(block => {
      assert.equal(block.lookup(":scope"), block.rootClass);
      let largeState = block.rootClass.getAttributeValue("[state|large]");
      assert(largeState);
      assert.equal(block.lookup("[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(block.lookup(".foo"), fooClass);
        let smallState = fooClass.getAttributeValue("[state|small]");
        assert(smallState);
        assert.equal(block.lookup(".foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }

  @test "can look up a referenced object"() {
    let { importer, config, factory } = setupImporting();
    importer.registerSource(
      "foo/bar/a-block.block.css",
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );
    let filename = "foo/bar/hasref.block.css";
    importer.registerSource(
      filename,
      `@block a-block from "a-block.block.css";`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(refblock => {
      let block = refblock.getReferencedBlock("a-block");
      if (block === null) {
        assert.fail("wtf");
        return;
      }
      assert.equal(refblock.lookup("a-block"), block.rootClass);
      let largeState = block.rootClass.getAttributeValue("[state|large]");
      assert(largeState);
      assert.equal(refblock.lookup("a-block[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(refblock.lookup("a-block.foo"), fooClass);
        let smallState = fooClass.getAttributeValue("[state|small]");
        assert(smallState);
        assert.equal(refblock.lookup("a-block.foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }

  @test "can look up a referenced object with an aliased named"() {
    let { importer, config, factory } = setupImporting();
    importer.registerSource(
      "foo/bar/a-block.block.css",
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );
    let filename = "foo/bar/hasref.block.css";
    importer.registerSource(
      filename,
      `@block my-block from "a-block.block.css";`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(refblock => {
      let block = refblock.getReferencedBlock("my-block");
      if (block === null) {
        assert.fail("wtf");
        return;
      }
      assert.equal(refblock.lookup("my-block"), block.rootClass);
      let largeState = block.rootClass.getAttributeValue("[state|large]");
      assert(largeState);
      assert.equal(refblock.lookup("my-block[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(refblock.lookup("my-block.foo"), fooClass);
        let smallState = fooClass.getAttributeValue("[state|small]");
        assert(smallState);
        assert.equal(refblock.lookup("my-block.foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }
}
