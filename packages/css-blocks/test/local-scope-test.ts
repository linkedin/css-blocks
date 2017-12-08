import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import cssBlocks = require("../src/cssBlocks");
import {
  PluginOptions,
  PluginOptionsReader,
  BlockFactory
} from "../src";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("Local Scope lookup")
export class LocalScopeLookupTest extends BEMProcessor {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test "can look up a local object"() {
    let imports = new MockImportRegistry();
    let filename = "foo/bar/a-block.css";
    imports.registerSource(filename,
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new PluginOptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(block => {
      assert.equal(block.lookup(".root"), block.rootClass);
      let largeState = block.rootClass.states.getState("large");
      assert(largeState);
      assert.equal(block.lookup("[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(block.lookup(".foo"), fooClass);
        let smallState = fooClass.states.getState("small");
        assert(smallState);
        assert.equal(block.lookup(".foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }

  @test "can look up a referenced object"() {
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/a-block.block.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`
    );
    let filename = "foo/bar/hasref.block.css";
    imports.registerSource(filename,
      `@block-reference a-block from "a-block.block.css";`
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new PluginOptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(refblock => {
      let block = refblock.getReferencedBlock("a-block");
      if (block === null) {
        assert.fail("wtf");
        return;
      }
      assert.equal(refblock.lookup("a-block.root"), block.rootClass);
      let largeState = block.rootClass.states.getState("large");
      assert(largeState);
      assert.equal(refblock.lookup("a-block[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(refblock.lookup("a-block.foo"), fooClass);
        let smallState = fooClass.states.getState("small");
        assert(smallState);
        assert.equal(refblock.lookup("a-block.foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }

  @test "can look up a referenced object with an aliased named"() {
    let imports = new MockImportRegistry();
    imports.registerSource("foo/bar/a-block.block.css",
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`
    );
    let filename = "foo/bar/hasref.block.css";
    imports.registerSource(filename,
      `@block-reference my-block from "a-block.block.css";`
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new PluginOptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(refblock => {
      let block = refblock.getReferencedBlock("my-block");
      if (block === null) {
        assert.fail("wtf");
        return;
      }
      assert.equal(refblock.lookup("my-block.root"), block.rootClass);
      let largeState = block.rootClass.states.getState("large");
      assert(largeState);
      assert.equal(refblock.lookup("my-block[state|large]"), largeState);
      let fooClass = block.classes.find(c => c.name === "foo");
      if (fooClass) {
        assert.equal(refblock.lookup("my-block.foo"), fooClass);
        let smallState = fooClass.states.getState("small");
        assert(smallState);
        assert.equal(refblock.lookup("my-block.foo[state|small]"), smallState);
      } else {
        assert.fail("wtf");
      }
    });
  }
}
