import { assert as typedAssert } from "@opticss/util";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import {
  BlockFactory,
} from "../src/BlockFactory";
import {
  OptionsReader,
} from "../src/OptionsReader";
import cssBlocks = require("../src/cssBlocks");
import { AttrValue } from "../src/index";
import {
  PluginOptions,
} from "../src/options";

import { BEMProcessor } from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

@suite("State container")
export class StateContainerTest extends BEMProcessor {
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

  @test "finds boolean states"() {
    let imports = new MockImportRegistry();
    let filename = "foo/bar/a-block.css";
    imports.registerSource(
      filename,
      `[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(block => {
      let state = block.rootClass.getValue("[state|large]");
      typedAssert.isNotNull(state).and((state) => {
        assert.equal(state.isUniversal, true);
      });
      let classObj = block.getClass("foo");
      typedAssert.isNotNull(classObj).and(classObj => {
        let classState = classObj.getValue("[state|small]");
        typedAssert.isNotNull(classState).and(classState => {
          assert.equal(classState.isUniversal, true);
        });
      });
    });
  }
  @test "finds state groups"() {
    let imports = new MockImportRegistry();
    let filename = "foo/bar/a-block.css";
    imports.registerSource(
      filename,
      `[state|size=large] { font-size: 20px; }
       [state|size=small] { font-size: 10px; }
       [state|active] { color: red; }
       .foo[state|mode=collapsed] { display: none; }
       .foo[state|mode=minimized] { display: block; max-height: 100px; }
       .foo[state|mode=expanded] { display: block; }`,
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(block => {
      let sizeGroup: Array<AttrValue> = block.rootClass.getValues("[state|size]");
      assert.equal(sizeGroup.length, 2);
      assert.includeMembers(sizeGroup.map(s => s.uid), ["large", "small"]);
      let subtateGroup: Array<AttrValue> = block.rootClass.getValues("[state|size]", "large");
      assert.equal(subtateGroup.length, 1);
      assert.includeMembers(subtateGroup.map(s => s.uid), ["large"]);
      let missingGroup: Array<AttrValue> = block.rootClass.getValues("[state|asdf]");
      assert.equal(missingGroup.length, 0);
      let missingSubstate: Array<AttrValue> = block.rootClass.getValues("[state|size]", "tiny");
      assert.equal(missingSubstate.length, 0);
      typedAssert.isNotNull(block.getClass("foo")).and(classObj => {
        let modeGroup: Array<AttrValue> = classObj.getValues("[state|mode]");
        assert.equal(modeGroup.length, 3);
        assert.includeMembers(modeGroup.map(s => s.uid), ["collapsed", "minimized", "expanded"]);
      });
    });
  }
  @test "resolves inherited state groups"() {
    let imports = new MockImportRegistry();
    let filename = "foo/bar/sub-block.block.css";
    imports.registerSource(
      "foo/bar/base-block.block.css",
      `[state|size=large] { font-size: 20px; }
       [state|size=small] { font-size: 10px; }
       [state|active] { color: red; }
       .foo[state|mode=collapsed] { display: none; }
       .foo[state|mode=minimized] { display: block; max-height: 100px; }
       .foo[state|mode=expanded] { display: block; }`,
    );
    imports.registerSource(
      filename,
      `@block-reference base-block from "base-block.block.css";
       :scope { extends: base-block; }
       [state|size=tiny] { font-size: 6px; }
       .foo[state|mode=minimized] { display: block; max-height: 200px; }`,
    );

    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);

    return factory.getBlock(importer.identifier(null, filename, reader)).then(block => {
      let sizeGroup = block.rootClass.resolveValues("[state|size]");
      assert.equal(sizeGroup.size, 3);
      assert.includeMembers([...sizeGroup.keys()], ["large", "small", "tiny"]);
      typedAssert.isNotNull(block.getClass("foo")).and(classObj => {
        let modeGroup = classObj.resolveValues("[state|mode]");
        assert.equal(modeGroup.size, 3);
        typedAssert.isDefined(modeGroup).and(modeGroup => {
          typedAssert.isDefined(modeGroup.get("collapsed")).and(state => {
            assert.equal(state.block, block.base);
          });
          typedAssert.isDefined(modeGroup.get("minimized")).and(state => {
            assert.equal(state.block, block);
          });
        });
      });
    });
  }
}
