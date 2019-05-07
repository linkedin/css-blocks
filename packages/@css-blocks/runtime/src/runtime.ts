export type whatever = string | number | boolean | symbol | object | null | undefined | void;

export function runtime(shape: string[], classes: string[], exprs: whatever[]): string {

  // We dynamically determine the variable window size based on the number of
  // expressions it is possible to reference. It is the compiler's responsibility
  // to guarantee the expression shape matches at build time.
  const VAR_SIZE = ~~Math.log2(exprs.length - 1) + 1;

  let out     = "";    // Output class list.
  let klass   = 0;     // Current class we are determining presence for.
  let val     = null;  // Working boolean expression value.
  let step    = 0;     // Character count used for opcode discovery.
  let current = null;  // Current discovered opcode to evaluate.
  let next    = 0;     // This is a single lookahead parser – next opcode will be stored here.
  let op      = null;  // Operation to evaluate on next val discovered.
  let invert  = false; // Should we invert the next discovered value.
  // let stack    = []; // Stack for nested boolean expressions

  // For each 32 bit integer passed to us as a base 36 string
  for ( let segment of shape ) {

    // Convert binary string segment to a base 10 integer
    let integer = parseInt(segment, 36);

    // Process each bit in this 32 bit integer.
    // Note: `while` loop is faster than a `for` loop here.
    let iters = 32;
    while (iters--) {

      // Construct our lookahead opcode and "pop" a bit off the end
      // of our integer's binary representation.
      let size = (current === 1 ? VAR_SIZE : 3);
      next += integer % 2 * (2 * (size - 1 - step) || 1); // tslint:disable-line
      integer = integer >>> 1;                            // tslint:disable-line

      // When we have discovered the next opcode, process.
      if (!(step = ++step % size)) {

        // Each opcode type requires implementation
        switch (current) {

          // If no current op-code, move on.
          case null: break;

          // OPEN: `000`
          case 0: break;

          // VAL: `001`
          case 1:
            let tmp = invert ? !exprs[next] : !!exprs[next];
            switch (op) {
              case 3: val = val || tmp; break;
              case 4: val = val && tmp; break;
              case 5: val = val === tmp; break;
              default: val = tmp;
            }
            op = null;
            invert = false;
            break;

          // NOT: `010`
          case 2: invert = true; break;

          // OR: `011`
          case 3: op = 3; break;

          // AND: `100`
          case 4: op = 4; break;

          // EQUAL: `101`
          case 5: op = 5; break;

          // CLOSE: `110`
          case 6: break;

          // CONCAT: `111`
          case 7:
            out += val ? (out ? " " : "") + classes[klass] : "";
            klass++;
            break;

          // If op-code is unrecognized, throw.
          default: throw new Error("Unknown CSS Blocks op-code.");
        }

        // Begin construction of next opcode. Skip `val` indices.
        current = (current === 1) ? null : next;
        next = 0;
      }
    }
    out += val ? (out ? " " : "") + classes[klass] : "";
  }

  return out;
}
