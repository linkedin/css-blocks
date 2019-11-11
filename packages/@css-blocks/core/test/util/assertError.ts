import { assert } from "chai";
import { postcss } from "opticss";

import { MultipleCssBlockErrors } from "../../src";
import cssBlocks from ".././util/postcss-helper";

export interface ErrorTypeMessage {
  type: typeof cssBlocks.CssBlockError;
  message: string;
}

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

export function assertParseError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: Promise<unknown>) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message.split(errorType.prefix + ":")[1].trim(), message);
    });
}

export function assertMultipleErrors(errors: ErrorTypeMessage[], promise: postcss.LazyResult) {
  return promise.then(
    () => {
      assert(false, `Error MultpleCssBlockErrors was not raised.`);
    },
    (multipleErrorsError: MultipleCssBlockErrors) => {
      return errors.forEach((error, idx) => {
        assert(error.type.name, typeof multipleErrorsError.errors[idx]);
        assert.deepEqual(multipleErrorsError.errors[idx].message.split(error.type.prefix + ":")[1].trim(), error.message);
      });
    });
}
