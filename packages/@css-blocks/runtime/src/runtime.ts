type Invert = true | null;
type Op     = number | null;
type Value  = boolean | null;

const enum OP_CODE {
  CLOSE  = 0,
  OPEN   = 1,
  VAL    = 2,
  NOT    = 3,
  OR     = 4,
  AND    = 5,
  EQUAL  = 6,
  CONCAT = 7,
}

export function runtime(shape: string[], classes: string[], exprs: unknown[]): string {

  // We dynamically determine the variable window size based on the number of
  // expressions it is possible to reference. It is the compiler's responsibility
  // to guarantee the expression shape matches at build time.
  const NULL = (shape && null); // Minifier hax to save bytes.
  const VAR_SIZE = ~~Math.log2(exprs.length - 1) + 1; // Variable token size is dependant on the number of dynamic values passed.
  const stack: [Op, Value, Invert][]    = []; // Stack for nested boolean expressions

  let out   = "";    // Output class list.
  let klass = 0;     // Current class we are determining presence for.
  let current: Op    = NULL;  // Current discovered opcode to evaluate.
  let val: Value     = NULL;  // Working boolean expression value.
  let op: Op         = NULL;  // Operation to evaluate on next val discovered.
  let invert: Invert = NULL;  // Should we invert the next discovered value.

  // For each 32 bit integer passed to us as a base 36 string
  for ( let segment of shape ) {

    let tmp: Value = NULL; // Stores the right side of a boolean operation.
    let step  = 0;         // Character count used for opcode discovery.
    let next  = 0;         // This is a single lookahead parser – next opcode will be stored here.
    let integer = parseInt(segment, 36);    // Convert binary string segment to a base 10 integer
    let iters = integer.toString(2).length; // Process each bit in this integer, minus the first `1` inserted for significant bit padding.

    // Note: `while` loop is faster than a `for` loop here.
    while (iters--) {

      // Construct our lookahead opcode and "pop" a bit off the end
      // of our integer's binary representation.
      let size = (current === OP_CODE.VAL ? VAR_SIZE : 3);
      next += integer % 2 * (2 * (size - 1 - step) || 1); // tslint:disable-line
      integer = integer >>> 1;                            // tslint:disable-line

      // When we have discovered the next opcode, or are on the last opcode, process.
      if (!iters || !(step = ++step % size)) {

        // tslint:disable:switch-default
        switch (current) {

          // If no current op-code, move on.
          case NULL: break;

          // OPEN – Push state to stack and start fresh.
          case OP_CODE.OPEN:
            stack.push([op, val, invert]);
            val = invert = op = NULL;
            break;

          // VAL or CLOSE (fun fact: functionally the same thing!)
          case OP_CODE.CLOSE:
            tmp = val; // Save computed val.
            [ op, val, invert] = stack.pop()!;
            // Intentionally no break. Falls through to VAL evaluation.

          case OP_CODE.VAL:
            if (current !== OP_CODE.CLOSE) tmp = !!exprs[next]; // Save referenced val.

            tmp = invert ? !tmp : tmp; // Invert value if required.

            // Process boolean expression if requested. If no opcode, this is the left side value.
            switch (op) {
              case OP_CODE.OR:    val = val || tmp; break;
              case OP_CODE.AND:   val = val && tmp; break;
              case OP_CODE.EQUAL: val = val === tmp; break;
              default: val = tmp;
            }

            // Reset state. This is safe to do at all types here. Saves bytes.
            invert = op = NULL;
            break;

          // NOT – Save if we should invert the next value discovered.
          case OP_CODE.NOT: invert = true; break;

          // OR | AND | EQUAL – Save opcode value.
          case OP_CODE.OR:
          case OP_CODE.AND:
          case OP_CODE.EQUAL:
            op = current;
            break;

          // CONCAT – Apply class if `val` is truthy and reset state.
          case OP_CODE.CONCAT:
            out += val ? (out ? " " : "") + classes[klass] : "";
            klass++;
            op = invert = val = NULL;
            break;
        }

        // Begin construction of next opcode. Skip processing`val` index tokens.
        current = (current === OP_CODE.VAL) ? NULL : next;
        next = 0;
      }
    }
  }

  // End of expression does not require a CONCAT opcode.
  // Apply final class if `val` is truthy.
  out += val ? (out ? " " : "") + classes[klass] : "";
  return out;
}
