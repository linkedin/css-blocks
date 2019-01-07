import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

@suite("Block Factory")
export class BlockFactoryTests extends BEMProcessor {

  @test "can import a block"() {
    let { importer, config, factory } = setupImporting();
    let baseFilename = "foo/bar/base.css";
    importer.registerSource(
      baseFilename,
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`,
    );

    let extendsFilename = "foo/bar/extends.css";
    importer.registerSource(
      extendsFilename,
      `@block base from "./base.css";
       :scope { extends: base; color: red; }`,
    );
    let extendsBlockPromise = factory.getBlock(importer.identifier(null, extendsFilename, config));
    let baseBlockPromise = factory.getBlock(importer.identifier(null, baseFilename, config));
    return Promise.all([extendsBlockPromise, baseBlockPromise]).then(([extendsBlock, baseBlock]) => {
      assert.strictEqual(extendsBlock.base, baseBlock);
    });
  }

  @test "handles blocks with the same name"() {
    let { importer, config, factory } = setupImporting();

    let blockFilename1 = "foo/bar/block_1.css";
    importer.registerSource(
      blockFilename1,
      `:scope {
         block-name: block;
         color: red;
       }`,
    );

    let blockFilename2 = "foo/bar/block_2.css";
    importer.registerSource(
    blockFilename2,
    ` @block external from "./block_1.css";
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
