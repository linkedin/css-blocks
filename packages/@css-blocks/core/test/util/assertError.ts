import { assert } from "chai";
import { postcss } from "opticss";

import { CssBlockError, MultipleCssBlockErrors } from "../../src";
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
    (multipleErrorsError: MultipleCssBlockErrors) => assertMultipleErrorsWithoutPromise(multipleErrorsError, errors));
}

export function assertMultipleErrorsWithoutPromise(mainError: CssBlockError, errors: ErrorTypeMessage[]) {
  if (mainError instanceof MultipleCssBlockErrors) {
    assert.equal(mainError.errors.length, errors.length, "The number of errors thrown and expected does not match");
    errors.forEach((error, idx) => {
      assert(mainError.errors[idx] instanceof error.type, "Error raised was not of the type expected.");
      assert.deepEqual(mainError.errors[idx].message.split(error.type.prefix + ":")[1].trim(), error.message);
    });
  } else {
    assert.equal(1, errors.length, "The number of errors thrown and expected does not match");
    assert(mainError instanceof errors[0].type, "Error raised was not of the type expected.");
    assert.deepEqual(mainError.message.split(errors[0].type.prefix + ":")[1].trim(), errors[0].message);
  }
}
