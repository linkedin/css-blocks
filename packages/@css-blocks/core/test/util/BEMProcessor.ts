import { whatever } from "@opticss/util";

import { assert } from "chai";
import { postcss } from "opticss";
import * as perfectionist from "perfectionist";

import { Block, BlockFactory, CssBlockError, Options, resolveConfiguration } from "../../src";

import cssBlocks = require("../util/postcss-helper");

type BlockAndRoot = [Block, postcss.Container, BlockFactory];

export class BEMProcessor {
  process(filename: string, contents: string, opts?: Options) {
    let processOpts = { from: filename };
    let cssBlocksProcessor = cssBlocks(postcss);

    return postcss([
      cssBlocksProcessor(opts),
      perfectionist({format: "compact", indentSize: 2}),
    ]).process(contents, processOpts);
  }

  parseBlock(filename: string, css: string, opts?: Options): Promise<BlockAndRoot> {
    let config = resolveConfiguration(opts);
    let factory = new BlockFactory(config, postcss);
    let root = postcss.parse(css, { from: filename });
    return factory.parse(filename, root, "analysis").then((block) => {
      return <BlockAndRoot>[block, root, factory];
    });
  }

  assertError(errorType: typeof CssBlockError, message: string, promise: postcss.LazyResult) {
    return promise.then(
      () => assert(false, `Error ${errorType.name} was not raised.`),
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        let errMessage = !!~reason.message.indexOf(errorType.prefix) ? reason.message.split(errorType.prefix + ":")[1].trim() : reason.message;
        assert.deepEqual(errMessage, message);
      });
  }

  assertParseError(errorType: typeof CssBlockError, message: string, promise: Promise<whatever>) {
    return promise.then(
      () => assert(false, `Error ${errorType.name} was not raised.`),
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        let errMessage = !!~reason.message.indexOf(errorType.prefix) ? reason.message.split(errorType.prefix + ":")[1].trim() : reason.message;
        assert.deepEqual(errMessage, message);
      });
  }
}
