import { assert as typedAssert } from "@opticss/util";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { AttrValue } from "../src/index";

import { BEMProcessor } from "./util/BEMProcessor";
import cssBlocks = require("./util/postcss-helper");
import { setupImporting } from "./util/setupImporting";

@suite("Attribute container")
export class AttributeContainerTest extends BEMProcessor {
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

  @test "finds boolean attributes"() {
    let { imports, importer, config, factory } = setupImporting();
    let filename = "foo/bar/a-block.css";
    imports.registerSource(
      filename,
      `:scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(block => {
      let attr = block.rootClass.getAttributeValue("[state|large]");
      typedAssert.isNotNull(attr).and((attr) => {
        assert.equal(attr.isPresenceRule, true);
      });
      let classObj = block.getClass("foo");
      typedAssert.isNotNull(classObj).and(classObj => {
        let classAttr = classObj.getAttributeValue("[state|small]");
        typedAssert.isNotNull(classAttr).and(classAttr => {
          assert.equal(classAttr.isPresenceRule, true);
        });
      });
    });
  }

  @test "finds attribute groups"() {
    let { imports, importer, config, factory } = setupImporting();
    let filename = "foo/bar/a-block.css";
    imports.registerSource(
      filename,
      `:scope[state|size=large] { font-size: 20px; }
       :scope[state|size=small] { font-size: 10px; }
       :scope[state|active] { color: red; }
       .foo[state|mode=collapsed] { display: none; }
       .foo[state|mode=minimized] { display: block; max-height: 100px; }
       .foo[state|mode=expanded] { display: block; }`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(block => {
      let sizeGroup: Array<AttrValue> = block.rootClass.getAttributeValues("[state|size]");
      assert.equal(sizeGroup.length, 2);
      assert.includeMembers(sizeGroup.map(s => s.value), ["large", "small"]);
      let attrGroup: Array<AttrValue> = block.rootClass.getAttributeValues("[state|size]", "large");
      assert.equal(attrGroup.length, 1);
      assert.includeMembers(attrGroup.map(s => s.value), ["large"]);
      let missingGroup: Array<AttrValue> = block.rootClass.getAttributeValues("[state|asdf]");
      assert.equal(missingGroup.length, 0);
      let noAttr: Array<AttrValue> = block.rootClass.getAttributeValues("[state|size]", "tiny");
      assert.equal(noAttr.length, 0);
      typedAssert.isNotNull(block.getClass("foo")).and(classObj => {
        let modeGroup: Array<AttrValue> = classObj.getAttributeValues("[state|mode]");
        assert.equal(modeGroup.length, 3);
        assert.includeMembers(modeGroup.map(s => s.value), ["collapsed", "minimized", "expanded"]);
      });
    });
  }
  @test "resolves inherited attribute groups"() {
    let { imports, importer, config, factory } = setupImporting();
    let filename = "foo/bar/sub-block.block.css";
    imports.registerSource(
      "foo/bar/base-block.block.css",
      `:scope[state|size=large] { font-size: 20px; }
       :scope[state|size=small] { font-size: 10px; }
       :scope[state|active] { color: red; }
       .foo[state|mode=collapsed] { display: none; }
       .foo[state|mode=minimized] { display: block; max-height: 100px; }
       .foo[state|mode=expanded] { display: block; }`,
    );
    imports.registerSource(
      filename,
      `@block-reference base-block from "base-block.block.css";
       :scope { extends: base-block; }
       :scope[state|size=tiny] { font-size: 6px; }
       .foo[state|mode=minimized] { display: block; max-height: 200px; }`,
    );

    return factory.getBlock(importer.identifier(null, filename, config)).then(block => {
      let sizeGroup = block.rootClass.resolveAttributeValues("[state|size]");
      assert.equal(sizeGroup.size, 3);
      assert.includeMembers([...sizeGroup.keys()], ["large", "small", "tiny"]);
      typedAssert.isNotNull(block.getClass("foo")).and(classObj => {
        let modeGroup = classObj.resolveAttributeValues("[state|mode]");
        assert.equal(modeGroup.size, 3);
        typedAssert.isDefined(modeGroup).and(modeGroup => {
          typedAssert.isDefined(modeGroup.get("collapsed")).and(attr => {
            assert.equal(attr.block, block.base);
          });
          typedAssert.isDefined(modeGroup.get("minimized")).and(attr => {
            assert.equal(attr.block, block);
          });
        });
      });
    });
  }
}
