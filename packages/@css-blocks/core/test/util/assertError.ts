import { assert } from "chai";
import { postcss } from "opticss";

import { CascadingError, CssBlockError, MultipleCssBlockErrors } from "../../src";

type ErrorConstructors = typeof CssBlockError | typeof CascadingError;

export interface ErrorTypeMessage {
  type: ErrorConstructors;
  message: string;
  cause?: ErrorTypeMessage | Array<ErrorTypeMessage>;
}

export function assertError(errorType: ErrorConstructors, message: string, promise: postcss.LazyResult) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message.split(errorType.prefix + ":")[1].trim(), message);
    });
}

export function assertParseError(errorType: ErrorConstructors, message: string, promise: Promise<unknown>) {
  return promise.then(
    () => {
      assert(false, `Error ${errorType.name} was not raised.`);
    },
    (reason) => {
      assert(reason instanceof errorType, reason.toString());
      assert.deepEqual(reason.message.split(errorType.prefix + ":")[1].trim(), message);
    });
}

export function assertMultipleErrorsRejection(errors: ErrorTypeMessage[], promise: postcss.LazyResult) {
  return promise.then(
    () => {
      assert(false, `Error MultpleCssBlockErrors was not raised.`);
    },
    (multipleErrorsError: MultipleCssBlockErrors) => assertMultipleErrors(multipleErrorsError, errors));
}

export function assertMultipleErrors(mainError: CssBlockError, errorDescriptions: ErrorTypeMessage[]) {
  if (mainError instanceof MultipleCssBlockErrors) {
    assert.equal(mainError.errors.length, errorDescriptions.length, "The number of errors thrown and expected does not match");
    errorDescriptions.forEach((errorDescription, idx) => {
      let actualError = mainError.errors[idx];
      assertErrorOccurred(actualError, errorDescription);
    });
  } else {
    assert.equal(1, errorDescriptions.length, "The number of errors thrown and expected does not match");
    assertErrorOccurred(mainError, errorDescriptions[0]);
  }
}

export function assertErrorOccurred(mainError: CssBlockError, errorDescription: ErrorTypeMessage) {
  assert.instanceOf(mainError, errorDescription.type, `Error raised (${mainError.constructor.name}) was not of the type expected.`);
  assert.deepEqual(mainError.message.split(errorDescription.type.prefix + ":")[1].trim(), errorDescription.message);
  if (errorDescription.cause) {
    let cause = (<CascadingError>mainError).cause;
    if (!cause) {
      assert.fail("A cause for the error was expected");
    }
    if (Array.isArray(errorDescription.cause)) {
      assertMultipleErrors(cause, errorDescription.cause);
    } else {
      assertErrorOccurred(cause, errorDescription.cause);
    }
  }
}
