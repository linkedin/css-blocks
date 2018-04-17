import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import * as cssBlocks from "../src";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

@suite("Block Factory")
export class BlockFactoryTests extends BEMProcessor {
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

  @test "can import a block"() {
    let { imports, importer, config, factory } = setupImporting();
    let baseFilename = "foo/bar/base.css";
    imports.registerSource(
      baseFilename,
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    let extendsFilename = "foo/bar/extends.css";
    imports.registerSource(
      extendsFilename,
      `@block-reference base from "./base.css";
       :scope { extends: base; color: red; }`,
    );
    let extendsBlockPromise = factory.getBlock(importer.identifier(null, extendsFilename, config));
    let baseBlockPromise = factory.getBlock(importer.identifier(null, baseFilename, config));
    return Promise.all([extendsBlockPromise, baseBlockPromise]).then(([extendsBlock, baseBlock]) => {
      assert.strictEqual(extendsBlock.base, baseBlock);
    });
  }

  @test "handles blocks with the same name"() {
    let { imports, importer, config, factory } = setupImporting();

    let blockFilename1 = "foo/bar/block_1.css";
    imports.registerSource(
      blockFilename1,
      `:scope {
         block-name: block;
         color: red;
       }`,
    );

    let blockFilename2 = "foo/bar/block_2.css";
    imports.registerSource(
    blockFilename2,
    ` @block-reference external from "./block_1.css";
      :scope {
        block-name: block;
        color: red;
      }
    `);

    let blockPromise1 = factory.getBlock(importer.identifier(null, blockFilename1, config));
    let blockPromise2 = factory.getBlock(importer.identifier(null, blockFilename2, config));
    return Promise.all([blockPromise1, blockPromise2]).then(([block1, block2]) => {
      assert.equal(block1.name, "block");
      assert.equal(block2.name, "block-2");
    });

  }

}
