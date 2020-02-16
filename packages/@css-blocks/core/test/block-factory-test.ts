import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import * as cssBlocks from "../src";
import { BlockFactory } from "../src";

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
       :scope[large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );

    let extendsFilename = "foo/bar/extends.css";
    imports.registerSource(
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

  @test async "cannot import a block with errors"() {
    let { imports, importer, config, factory } = setupImporting();
    let baseFilename = "foo/bar/base.css";
    imports.registerSource(
      baseFilename,
      `:scope { color: purple; }
       :scope[large] div { font-size: 20px; } /* Error: div is not allowed */
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );

    let extendsFilename = "foo/bar/extends.css";
    imports.registerSource(
      extendsFilename,
      `@block base from "./base.css";
       :scope { extends: base; color: red; }`,
    );
    try {
      await factory.getBlock(importer.identifier(null, extendsFilename, config));
      assert.fail("Exception wasn't raised.");
    } catch (e) {
      assert.equal(e.message, `MultipleCssBlockErrors:
\t1. Error: [css-blocks] BlockSyntaxError: Tag name selectors are not allowed: :scope[large] div (foo/bar/base.css:2:22)
\t2. Error: [css-blocks] BlockSyntaxError: Missing block object in selector component 'div': :scope[large] div (foo/bar/base.css:2:22)
\t3. Error: [css-blocks] BlockSyntaxError: No Block named "base" found in scope. (foo/bar/extends.css:2:17)`);
    }
  }

  @test async "handles blocks with the same name"() {
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
    ` @block external from "./block_1.css";
      :scope {
        block-name: block;
        color: red;
      }
    `);

    let block1 = await factory.getBlock(importer.identifier(null, blockFilename1, config));
    let block2 = await factory.getBlock(importer.identifier(null, blockFilename2, config));
    assert.equal(block1.name, "block");
    assert.equal(block2.name, "block-2");
  }

  @test async "can import a block with errors by setting faultTolerant to true"() {
    let { imports, importer, config } = setupImporting();
    // create a block factory that's fault tolerant
    let factory = new BlockFactory(config, postcss, true);
    let baseFilename = "foo/bar/base.css";
    // create a block with an error
    imports.registerSource(
      baseFilename,
      `:scope { color: purple; }
       :scope[large] :scope[error] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );

    await factory.getBlock(importer.identifier(null, baseFilename, config));
  }

  @test async "cannot import a block with errors when faultTolerant is not set"() {
    let { imports, importer, config } = setupImporting();
    // create a block factory that's fault tolerant
    let factory = new BlockFactory(config, postcss);
    let baseFilename = "foo/bar/base.css";
    // create a block with an error
    imports.registerSource(
      baseFilename,
      `:scope { color: purple; }
       :scope[large] :scope[error] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }`,
    );

    try {
      await factory.getBlock(importer.identifier(null, baseFilename, config));
    } catch (e) {
      assert.ok(true);
    }
  }
}
