type Invert = true | null;
type Op     = number | null;
type Value  = boolean | null;

export const enum OP_CODE {
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
  const VAR_SIZE = ~~Math.log2(exprs.length - 1) + 1;
  const stack: [Op, Value, Invert][]    = []; // Stack for nested boolean expressions

  let out   = "";    // Output class list.
  let klass = 0;     // Current class we are determining presence for.
  let current: Op    = null;  // Current discovered opcode to evaluate.
  let val: Value     = null;  // Working boolean expression value.
  let op: Op         = null;  // Operation to evaluate on next val discovered.
  let invert: Invert = null;  // Should we invert the next discovered value.

  // For each 32 bit integer passed to us as a base 36 string
  for ( let segment of shape ) {

    let integer = parseInt(segment, 36); // Convert binary string segment to a base 10 integer
    let step  = 0;     // Character count used for opcode discovery.
    let next  = 0;     // This is a single lookahead parser – next opcode will be stored here.

    // Process each bit in this integer, minus the first `1` inserted for significant bit padding.
    // Note: `while` loop is faster than a `for` loop here.
    let iters = integer.toString(2).length;
    main: while (iters--) {

      // Construct our lookahead opcode and "pop" a bit off the end
      // of our integer's binary representation.
      let size = (current === OP_CODE.VAL ? VAR_SIZE : 3);
      next += integer % 2 * (2 * (size - 1 - step) || 1); // tslint:disable-line
      integer = integer >>> 1;                            // tslint:disable-line

      // When we have discovered the next opcode, process.
      if (iters === 0 || !(step = ++step % size)) {
        let tmp: Value = null;
        switch (current) {

          // If no current op-code, move on.
          case null: break;

          // OPEN
          case OP_CODE.OPEN:
            stack.push([op, val, invert]);
            val = invert = op = null;
            break;

          // VAL: `010`
          // CLOSE: `000`
          case OP_CODE.CLOSE:
            if (!stack.length) break main; // If we've hit a close with no stack, we're done.
            tmp = val;
            [ op, val, invert] = stack.pop()!;
            // Intentionally no break. Falls through to VAL evaluation.

          case OP_CODE.VAL:
            if (current !== OP_CODE.CLOSE) tmp = !!exprs[next];

            tmp = invert ? !tmp : tmp;

            switch (op) {
              case OP_CODE.OR:    val = val || tmp; break;
              case OP_CODE.AND:   val = val && tmp; break;
              case OP_CODE.EQUAL: val = val === tmp; break;
              default: val = tmp;
            }

            invert = op = null;
            break;

          // NOT: `010`
          case OP_CODE.NOT: invert = true; break;

          // OR: `011`
          // AND: `100`
          // EQUAL: `101`
          case OP_CODE.OR:
          case OP_CODE.AND:
          case OP_CODE.EQUAL:
            op = current;
            break;

          // CONCAT: `111`
          case OP_CODE.CONCAT:
            out += val ? (out ? " " : "") + classes[klass] : "";
            klass++;
            op = invert = val = null;
            break;

          // If op-code is unrecognized, throw.
          default: throw new Error("Unknown CSS Blocks op-code.");
        }

        // Begin construction of next opcode. Skip `val` indices.
        current = (current === OP_CODE.VAL) ? null : next;
        next = 0;
      }
    }
  }

  out += val ? (out ? " " : "") + classes[klass] : "";
  return out;
}
