// All four op codes that we can find in one of our binary strings.
// The SEP opcode is found when we have finished processing all
// sub-expressions required by the class boolean expressions. Remaining
// triples map directly to input classes.
export const enum OP_CODE {
  OR    = 0,
  AND   = 1,
  EQUAL = 2,
  SEP   = 3,
}

// The three discovery states that our parser can be in. Looking for an
// op code, the left operand, or the right operand.
const enum STATE {
  OP = 0,
  LEFT = 1,
  RIGHT = 2,
}

/* I'm special. (The rules don't apply when you're coding for a minifier) */
/* tslint:disable:triple-equals typedef-whitespace no-unnecessary-type-assertion prefer-for-of*/
export function runtime(shape: string[], classes: string[], args: unknown[]): string {

  const exprs = args.slice();  // Expressions storage.
  let exprCount = args.length; // Running count of expressions.

  let out = ""; // Output class string.

  let left: boolean; // The left side of a boolean expression.
  let op:   OP_CODE; // The operator for a boolean expression.
  let val:  boolean; // Stores the right side of a boolean expression, and the final expression result.

  // Holds state on token ingestion.
  // We're either discovering an OP_CODE, a left, or a right value.
  let state: STATE  = STATE.OP;

  let classIdx = -1; // The class index we're determining presence for – set to 0 when `SEP` is encountered.
  let working  = 0;  // Next ingested value will be stored here.
  let size     = 2;  // Variable window size, re-computed as expressions are calculated and added.

  // For every binary encoded string...
  for (let i = 0; i < shape.length; i++) {

    // Convert binary string segment to a base 10 integer.
    let integer = parseInt(shape[i], 36);

    // Process each bit in this integer. The parser ensures 32 bit integers
    // are emitted. This is important because bitwise operations in JS clamp
    // app operands to 32 bit integers.
    // Note: `while` loop is faster than a `for` loop here.
    let iters = 32;
    while (iters--) {

      // If we've discovered the separator opcode, begin applying classes.
      if (op! == OP_CODE.SEP) { state = classIdx = 0; }

      // Variable token size is dependant on the number of values it is possible to reference.
      // Add an extra bit to token size to accommodate the "not" bit encoded with every var reference.
      // This code block must happen *before* the !size check below to properly construct opcode vals.
      if (!size) {
        // This is a very clever way to do Math.ceil(Math.log2(exprCount-1)).
        while(exprCount - 1 >> size++); // tslint:disable-line
        // If state == 0, we know we're looking for an opcode and size is 2.
        size = (!state) ? 2 : size;
      }

      // Construct our next value and "pop" a bit off the end. `<<` serves as a faster Base2 Math.pow()
      working += integer % 2 * (1 << (--size) || 1); // tslint:disable-line
      integer >>>= 1;                                // tslint:disable-line

      // If we have a full value or opcode, process the expression.
      // Otherwise, continue to consume the next bit until we do.
      if (!size) {

        // Fetch the resolved expression value if we're looking for the LEFT or RIGHT value.
        // The last bit of every VAL token is the NOT bit. If `1`, invert the recovered value.
        // This is a throwaway value if we're discovering the OP.
        val = !!(state && (+!!exprs[working >>> 1] ^ (working % 2))); // tslint:disable-line

        // If discovering as opcode, save as an opcode.
        if (state == STATE.OP) { op = working; }

        // If discovering a left side operation value, save as the left value.
        if (state == STATE.LEFT) { left = val; }

        // If we've found the right side value...
        if (state == STATE.RIGHT) {

          // Run the correct operation on our left and right values.
          // Not a switch for code size reasons.
          if (op! == OP_CODE.OR)    { val = left! || val;  }
          if (op! == OP_CODE.AND)   { val = left! && val;  }
          if (op! == OP_CODE.EQUAL) { val = left! === val; }

          // Save our computed expression value to the next expression index.
          exprs[exprCount++] = val;

          // If classIdx > -1, start concatenating classes based on result of `val`.
          // Increment to the next class. If this was the last class, break
          // out of the loops so we don't process extra 0's.
          if (!!~classIdx) {
            out += val ? (out ? " " : "") + classes[classIdx] : "";
            if (++classIdx == classes.length) { break; }
          }
        }

        // Reset our working state and begin discovering the next token.
        working = 0;
        state = ++state % 3;
      }
    }
  }

  // Return the concatenated classes!
  return out;
}
