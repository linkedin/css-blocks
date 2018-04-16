import { whatever } from "@opticss/util";
import { assert } from "chai";
import { postcss } from "opticss";

import cssBlocks from ".././util/postcss-helper";

export function assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message.split(errorType.prefix + ":")[1].trim(), message);
    });
}

export function assertParseError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: Promise<whatever>) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message.split(errorType.prefix + ":")[1].trim(), message);
    });
}
