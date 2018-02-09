import * as Lint from "tslint";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new MultilineParametersRule(sourceFile, this.getOptions()));
  }
}

type CallLike = ts.CallExpression
              | ts.CallSignatureDeclaration
              | ts.ArrowFunction
              | ts.MethodDeclaration
              | ts.FunctionDeclaration
              | ts.ConstructorDeclaration
              | ts.FunctionExpression
              | ts.NewExpression
              ;
type ArgLike = ts.Expression | ts.ParameterDeclaration;
type ArgListLike = ts.NodeArray<ts.Expression> | ts.NodeArray<ts.ParameterDeclaration>;

interface CheckOptions {
  omitTrailingNewline: boolean;
  startPos: number;
}

// The walker takes care of all the work.
class MultilineParametersRule extends Lint.RuleWalker {
  visitConstructorDeclaration(constructorDecl: ts.ConstructorDeclaration): void {
    this.checkArgList('parameter', constructorDecl, constructorDecl.parameters);
  }
  visitFunctionDeclaration(fn: ts.FunctionDeclaration): void {
    this.checkArgList('parameter', fn, fn.parameters);
  }
  visitFunctionExpression(fn: ts.FunctionExpression): void {
    let options: Partial<CheckOptions> = {};
    if (fn.parent && ts.isVariableDeclaration(fn.parent)
        && fn.parent.parent && ts.isVariableDeclarationList(fn.parent.parent)) {
      options.startPos = fn.parent.parent.getStart();
    }
    this.checkArgList('parameter', fn, fn.parameters, options);
  }
  visitArrowFunction(arrowFn: ts.ArrowFunction): void {
    let options: Partial<CheckOptions> = {};
    if (arrowFn.parent && ts.isVariableDeclaration(arrowFn.parent)
        && arrowFn.parent.parent && ts.isVariableDeclarationList(arrowFn.parent.parent)) {
      options.startPos = arrowFn.parent.parent.getStart();
    }
    this.checkArgList('parameter', arrowFn, arrowFn.parameters, options);
  }
  visitMethodDeclaration(methodDecl: ts.MethodDeclaration): void {
    this.checkArgList('parameter', methodDecl, methodDecl.parameters);
    super.visitMethodDeclaration(methodDecl);
  }
  visitCallSignature(callSig: ts.CallSignatureDeclaration): void {
    this.checkArgList('parameter', callSig, callSig.parameters);
  }
  visitCallExpression(callExpr: ts.CallExpression): void {
    this.checkArgList('argument', callExpr, callExpr.arguments, {omitTrailingNewline: true});
  }
  visitNewExpression(newExpr: ts.NewExpression): void {
    let args: ts.NodeArray<ts.Expression> = newExpr.arguments || ts.createNodeArray();
    this.checkArgList('argument', newExpr, args, {omitTrailingNewline: true});
  }

  checkArgList(type: string, callTarget: CallLike, args: ArgListLike, options: Partial<CheckOptions> = {}): void {
    let lines = this.getLines(callTarget, args);
    if (this.isMultiline(lines)) {
      let callLine = lines[0];
      let argLine = lines[1];
      if (argLine === callLine) {
        const fix = this.createReplacement(args[0].getStart(), 0, `\n${this.getIndent(args[1])}`);
        this.addFailureAtNode(args[0], `Newline expected before first multi-line ${type}.`, fix);
      }
      let omitTrailingNewline = options.omitTrailingNewline || false;
      if (!omitTrailingNewline) {
        let lastArg = args[args.length - 1];
        let lastArgEnd = this.getLineAndCharacterOfPosition(lastArg.getEnd());
        let argListEndPos = args.end;
        if (args.hasTrailingComma) {
          argListEndPos = argListEndPos + 1;
        }
        let argListEnd = this.getLineAndCharacterOfPosition(argListEndPos);
        if (argListEnd.line === lastArgEnd.line) {
          let startPos = (options.startPos === undefined) ? callTarget.getStart() : options.startPos;
          let argListStart = this.getLineAndCharacterOfPosition(startPos);
          const fix = this.createReplacement(argListEndPos, 0, `\n${" ".repeat(argListStart.character)}`);
          this.addFailureAtNode(lastArg, `Newline expected after last multi-line ${type}.`, fix);
        }
      }
    }
  }

  getLines(node: CallLike, args: ArgListLike): Array<number> {
    let a = [];
    let sourceFile = node.getSourceFile();
    a.push(this.getLine(node, sourceFile));
    for (let arg of args) {
      a.push(this.getLine(arg, sourceFile));
    }
    return a;
  }
  getLine(
    node: ts.Node,
    sourceFile?: ts.SourceFile,
  ): number {
    return this.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  }
  getIndent(node: ts.Node, sourceFile?: ts.SourceFile): string {
    let col = this.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character;
    return " ".repeat(col);
  }
  isMultiline(lines: Array<number>): boolean {
    let line = lines[0];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] !== line) {
        return true;
      }
    }
    return false;
  }
}
