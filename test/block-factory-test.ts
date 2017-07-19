import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import cssBlocks = require("../src/cssBlocks");
import {
  PluginOptions,
} from "../src/options";
import {
  OptionsReader,
} from "../src/OptionsReader";
import {
  BlockFactory
} from "../src/Block/BlockFactory";

import BEMProcessor from "./util/BEMProcessor";
import { MockImportRegistry } from "./util/MockImportRegistry";

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
    let imports = new MockImportRegistry();
    let baseFilename = "foo/bar/base.css";
    imports.registerSource(baseFilename,
      `.root { color: purple; }
       [state|large] { font-size: 20px; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }`
    );

    let extendsFilename = "foo/bar/extends.css";
    imports.registerSource(extendsFilename,
      `@block-reference "./base.css";
       .root { extends: base; color: red; }`
    );
    let importer = imports.importer();
    let options: PluginOptions = {importer: importer};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(options, postcss);
    let extendsBlockPromise = factory.getBlock(importer.identifier(null, extendsFilename, reader));
    let baseBlockPromise = factory.getBlock(importer.identifier(null, baseFilename, reader));
    return Promise.all([extendsBlockPromise, baseBlockPromise]).then(([extendsBlock, baseBlock]) => {
      assert.strictEqual(extendsBlock.base, baseBlock);
    });
  }
}
