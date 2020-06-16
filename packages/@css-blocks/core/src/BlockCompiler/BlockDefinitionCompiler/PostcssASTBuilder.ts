import { postcss } from "opticss";

import { BlockExport, BlockReference, BlockSyntaxVersion, DefinitionAST, GlobalDeclaration, LocalBlockExport, Name, Rename, Rule, Visitor, visit } from "../../BlockParser/ast";
import { BLOCK_GLOBAL } from "../../BlockSyntax";

import { SelectorASTBuilder } from "./SelectorASTBuilder";

export class PostcssASTBuilder implements Visitor<DefinitionAST> {
  postcss: typeof postcss;
  root: postcss.Root;
  currentRule: postcss.Rule | undefined;
  constructor(postcssImpl: typeof postcss) {
    this.postcss = postcssImpl;
    this.root = this.postcss.root();
  }

  namedReferences(references: Array<Name | Rename>): string {
    let result = "";
    result += "(";
    let prevRef = false;
    for (let ref of references) {
      if (prevRef) {
        result += ", ";
      }
      result += ref.name;
      if (ref.asName) {
        result += ` as ${ref.asName}`;
      }
      prevRef = true;
    }
    result += ")";
    return result;
  }

  BlockSyntaxVersion(blockSyntaxVersion: BlockSyntaxVersion): void {
    this.root.append(this.postcss.atRule({
      name: "block-syntax-version",
      params: blockSyntaxVersion.version.toString(),
    }));
  }

  BlockReference(blockReference: BlockReference): void {
    let params = "";
    if (blockReference.defaultName) {
      params += blockReference.defaultName;
    }
    if (blockReference.defaultName && blockReference.references) {
      params += ", ";
    }
    if (blockReference.references) {
      params += this.namedReferences(blockReference.references);
    }
    params += ` from "${blockReference.fromPath}"`;
    let atRule = this.postcss.atRule({
      name: "block",
      params,
    });
    this.root.append(atRule);
  }

  LocalBlockExport(localBlockExport: LocalBlockExport): void {
    let params = this.namedReferences(localBlockExport.exports);
    let atRule = this.postcss.atRule({
      name: "export",
      params,
    });
    this.root.append(atRule);
  }

  BlockExport(blockExport: BlockExport): void {
    let params = this.namedReferences(blockExport.exports);
    params += ` from "${blockExport.fromPath}"`;
    let atRule = this.postcss.atRule({
      name: "export",
      params,
    });
    this.root.append(atRule);
  }

  Rule(rule: Rule<DefinitionAST>): void | boolean {
    let selectors = new Array<string>();
    for (let sel of rule.selectors) {
      let visitor = new SelectorASTBuilder();
      visit(visitor, sel);
      selectors.push(visitor.selector);
    }
    let currentRule = postcss.rule({selectors});
    for (let declaration of rule.declarations) {
      currentRule.append(
        postcss.decl({prop: declaration.property, value: declaration.value}),
      );
    }
    this.root.append(currentRule);
    return false;
  }
  GlobalDeclaration(globalDeclaration: GlobalDeclaration): false {
    let selectorBuilder = new SelectorASTBuilder();
    visit(selectorBuilder, globalDeclaration.selector);
    let atRule = postcss.atRule({name: BLOCK_GLOBAL, params: selectorBuilder.selector});
    this.root.append(atRule);
    return false;
  }
}
