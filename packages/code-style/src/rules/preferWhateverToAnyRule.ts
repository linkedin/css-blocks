import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new PreferWhateverToAny(sourceFile, this.getOptions()));
  }
}

// The walker takes care of all the work.
class PreferWhateverToAny extends Lint.RuleWalker {
  visitAnyKeyword(node: ts.Node): void {
    let fix = this.createReplacement(node.getStart(), 3, "whatever");
    this.addFailureAtNode(node, "Using `any` is usually a bad idea. Consider using `whatever` from @opticss/util instead.", fix);
  }
}
