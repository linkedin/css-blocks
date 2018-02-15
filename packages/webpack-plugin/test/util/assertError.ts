import { assert } from "chai";
import cssBlocks = require("css-blocks");
import * as postcss from "postcss";

export function assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message, message);
    });
}
