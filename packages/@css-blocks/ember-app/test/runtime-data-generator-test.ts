import { Block, BlockFactory } from "@css-blocks/core";
import { EmberAnalyzer } from "@css-blocks/ember-utils";
import { StyleMapping } from "@opticss/template-api";
import * as assert from "assert";

import { RuntimeDataGenerator } from "../src/RuntimeDataGenerator";

describe("Runtime Data Generator", function () {

  beforeEach(async () => {
  });

  afterEach(async () => {
  });

  it("Generates block information", function () {
    let factory = new BlockFactory({});
    let analyzer = new EmberAnalyzer(factory);
    let mapping = new StyleMapping({analyzedAttributes: ["class"], analyzedTagnames: false, rewriteIdents: {id: false, class: true}});
    let block = new Block("test-block-1", "test-block-1", "abcde");
    let aClass = block.ensureClass("a-class");
    let attr = aClass.ensureAttribute("[an-attr]");
    attr.ensureValue("one");
    attr.ensureValue("two");
    attr.ensureValue("three");
    let subBlock = new Block("test-block-2", "test-block-2", "abcde");
    subBlock.setBase(block);
    let subClass = subBlock.ensureClass("a-class");
    let subAttr = subClass.ensureAttribute("[an-attr]");
    subAttr.ensureValue("three");
    subAttr.ensureValue("four");
    let generator = new RuntimeDataGenerator([block, subBlock], mapping, analyzer, factory.configuration, new Set());
    let blockInfo = generator.generateBlockInfo(block);
    assert.deepEqual(
      blockInfo,
      {
        blockInterfaceStyles: {
          ".a-class": 0,
          ".a-class[an-attr=one]": 1,
          ".a-class[an-attr=three]": 2,
          ".a-class[an-attr=two]": 3,
          ":scope": 4,
        },
        groups: {
          ".a-class[an-attr]": {
            one: ".a-class[an-attr=one]",
            two: ".a-class[an-attr=two]",
            three: ".a-class[an-attr=three]",
          },
        },
        implementations: {
          "0": [ 0, 1, 2, 3, 4 ],
          "1": [ 5, 1, 6, 3, 7 ],
        },
      },
    );
  });

});
