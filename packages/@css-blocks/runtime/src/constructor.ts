export const enum OP_CODE {
  CLOSE  = "000",
  OPEN   = "001",
  VAL    = "010",
  NOT    = "011",
  OR     = "100",
  AND    = "101",
  EQUAL  = "110",
  CONCAT = "111",
}

// The maximum safe number of opcodes we're able to encode in a single 32 bit integer
// However! When converting from base36 and back again, leading zeros are stripped. To
// fix this, we prefix every shape with a throwaway bit at the beginning, so the actual
// safe number is 31.
const MAX_SAFE_BITS = 31;

export class Expression {
  public ops: string[] = [];
  private classes: string[] = [];
  private exprs: unknown[] = [];
  private exprIdx: Map<unknown, number> = new Map();

  // The bit size of value encodings is dependent on the number of value
  // indices we need to keep track of.
  private valSize() { return ~~Math.log2(this.exprs.length - 1) + 1; }

  // Track a value, referenced by index.
  val(expr: unknown) {
    this.ops.push(OP_CODE.VAL);
    let idx = this.exprIdx.get(expr);
    if (idx === undefined) {
      idx = this.exprs.length;
      this.exprIdx.set(expr, idx);
      this.exprs.push(expr);
    }
    this.ops.push(idx.toString(2));
    return this;
  }

  // `when()` is a proxy for `val()` for better english-language-like constructor chains.
  when(expr: unknown) { return this.val(expr); }

  // The start of an expression. Apply this class when the following
  // expression evaluates to true for a given input.
  apply(klass: string)  {
    this.classes.push(klass);
    if (this.ops.length) { this.ops.push(OP_CODE.CONCAT); }
    return this;
  }

  // Operands
  get not()     { this.ops.push(OP_CODE.NOT); return this;   }
  get open()    { this.ops.push(OP_CODE.OPEN); return this;  }
  get or()      { this.ops.push(OP_CODE.OR); return this;    }
  get and()     { this.ops.push(OP_CODE.AND); return this;   }
  get equals()  { this.ops.push(OP_CODE.EQUAL); return this; }
  get close()   { this.ops.push(OP_CODE.CLOSE); return this; }

  // Introspection methods.
  getExprs(): unknown[] { return this.exprs.slice(0); }
  getClasses(): string[] { return this.classes.slice(0); }
  getOps(): string[] { return this.ops.slice(); }

  getBinary(): string[] {
    const OUT = [];
    let working = "";
    let isVal = false;
    for (let op of this.ops) {

      // If this opcode is a VAL (preceded by VAL opcode) ensure its binary
      // value is padded to be the valSize length.
      if (isVal) {
        op = "0".repeat(Math.max(this.valSize() - op.length , 0)) + op;
        isVal = false;
      }

      // If this opcode is a VAL, consume the next op as a value.
      isVal = op === OP_CODE.VAL;

      // If this opcode would overflow the MAX_SAVE_INTEGER when converted to
      // an integer, strike a new base36 string.
      if (working.length + op.length >= MAX_SAFE_BITS) {
        OUT.push(parseInt(`1${working.split("").reverse().join("")}`, 2).toString(36));
        working = "";
      }

      working += op;
    }
    return OUT;
  }

  // Calculate the binary string encoding of this expression's logic shape.
  getShape(): string[] {
    const OUT = [];
    let working = "";
    let isVal = false;
    for (let op of this.ops) {

      // If this opcode is a VAL (preceded by VAL opcode) ensure its binary
      // value is padded to be the valSize length.
      if (isVal) {
        op = "0".repeat(Math.max(this.valSize() - op.length , 0)) + op;
        isVal = false;
      }

      // If this opcode is a VAL, consume the next op as a value.
      isVal = op === OP_CODE.VAL;

      // If this opcode would overflow the MAX_SAVE_INTEGER when converted to
      // an integer, strike a new base36 string.
      if (working.length + op.length >= MAX_SAFE_BITS) {
        OUT.push(parseInt(`1${working.split("").reverse().join("")}`, 2).toString(36));
        working = "";
      }
      working += op;
    }
    if (working) { OUT.push(parseInt(`1${working.split("").reverse().join("")}`, 2).toString(36)); }
    return OUT;
  }
}
