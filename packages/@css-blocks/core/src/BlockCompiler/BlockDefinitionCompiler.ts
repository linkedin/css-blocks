import { postcss } from "opticss";

import { AttributeSelector, BlockExport, BlockReference, BlockSyntaxVersion, ClassSelector, Declaration, DefinitionAST, DefinitionRoot, ForeignAttributeSelector, GlobalDeclaration, LocalBlockExport, Mapper, Name, Rename, Rule, ScopeSelector, Selector, Visitor, builders, map as mapToDefinition, visit } from "../BlockParser/ast";
import { BLOCK_GLOBAL } from "../BlockSyntax";
import { Block, BlockClass, Style, isAttrValue, isBlockClass } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";

export const INLINE_DEFINITION_FILE = Symbol("Inline Definition");

export type PathResolver = (block: Block, fromPath: string) => string;

class CompiledDefinitionMapper implements Mapper<DefinitionAST> {
  pathResolver: PathResolver;
  block: Block;
  constructor(block: Block, pathResolver: PathResolver) {
    this.block = block;
    this.pathResolver = pathResolver;
  }
  BlockExport(fromPath: string, exports: Array<Name | Rename>) {
    fromPath = this.pathResolver(this.block, fromPath);
    return builders.blockExport(fromPath, exports);
  }
  BlockReference(fromPath: string, defaultName: string, references: Array<Name | Rename>) {
    fromPath = this.pathResolver(this.block, fromPath);
    return builders.blockReference(fromPath, defaultName, references);
  }
}

class SelectorASTBuilder implements Visitor<DefinitionAST> {
  selector: string;
  constructor() {
    this.selector = "";
  }
  AttributeSelector(attr: AttributeSelector): void {
    this.selector += `[${attr.attribute}`;
    if (attr.matches) {
      this.selector += attr.matches.matcher;
      this.selector += `"${attr.matches.value}"`;
    }
    this.selector += "]";
  }
  ForeignAttributeSelector(attr: ForeignAttributeSelector): void {
    this.selector += `[${attr.ns}|${attr.attribute}`;
    if (attr.matches) {
      this.selector += attr.matches.matcher;
      this.selector += `"${attr.matches.value}"`;
    }
    this.selector += "]";
  }
  ScopeSelector(_scopeSelector: ScopeSelector): void {
    this.selector += `:scope`;
  }
  ClassSelector(classSelector: ClassSelector): void {
    this.selector += `.${classSelector.name}`;
  }
}

class CompiledDefinitionPostcssASTBuilder implements Visitor<DefinitionAST> {
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

export class BlockDefinitionCompiler {
  postcss: typeof postcss;
  config: ResolvedConfiguration;
  pathResolver: PathResolver;
  constructor(postcssImpl: typeof postcss, pathResolver: PathResolver, config: ResolvedConfiguration) {
    this.postcss = postcssImpl;
    this.config = config;
    this.pathResolver = pathResolver;
  }

  compile(block: Block, reservedClassNames: Set<string>): postcss.Root {
    let ast = this.compileToAST(block, reservedClassNames);
    let visitor = new CompiledDefinitionPostcssASTBuilder(this.postcss);
    visit(visitor, ast);
    return visitor.root;
  }

  globalDeclarations(block: Block): Array<GlobalDeclaration> {
    let globals = new Array<GlobalDeclaration>();
    for (let attrValue of block.rootClass.allAttributeValues()) {
      if (attrValue.isGlobal) {
        let selector = builders.attributeSelector(attrValue.attribute.name, attrValue.isPresenceRule ? undefined : attrValue.value);
        globals.push(builders.globalDeclaration(selector));
      }
    }
    return globals;
  }

  compileToAST(block: Block, reservedClassNames: Set<string>): DefinitionRoot {
    if (!block.blockAST) {
      throw new Error("The block's AST is missing.");
    }
    let mapper = new CompiledDefinitionMapper(block, this.pathResolver);
    let definitionRoot: DefinitionRoot = mapToDefinition(mapper, block.blockAST, "block", "definition");
    definitionRoot.children.unshift(...this.globalDeclarations(block));
    definitionRoot.children.unshift(builders.blockSyntaxVersion(1));
    for (let style of block.all(true)) {
      definitionRoot.children.push(this.styleToRule(style, reservedClassNames));
    }
    return definitionRoot;
  }

  styleToRule(style: Style, reservedClassNames: Set<string>): Rule<DefinitionAST> {
    let selectors = new Array<Selector<DefinitionAST>>();
    let blockClass: BlockClass = isAttrValue(style) ? style.blockClass : style;
    let elementSelector: ClassSelector | ScopeSelector;
    if (blockClass.isRoot) {
      elementSelector = builders.scopeSelector();
    } else {
      elementSelector = builders.classSelector(blockClass.name);
    }
    if (isAttrValue(style)) {
      let attributeSelector: AttributeSelector;
      if (style.isPresenceRule) {
        attributeSelector = builders.attributeSelector(style.attribute.name);
      } else {
        attributeSelector = builders.attributeSelector(style.attribute.name, style.value);
      }
      selectors.push(builders.keyCompoundSelector(elementSelector, [attributeSelector]));
    } else {
      selectors.push(elementSelector);
    }
    let declarations = new Array<Declaration>();
    if (isBlockClass(style) && style.isRoot) {
      declarations.push(builders.declaration("block-id", `"${style.block.guid}"`));
      declarations.push(builders.declaration("block-name", `"${style.block.name}"`));
    }
    declarations.push(builders.declaration("block-class", style.cssClass(this.config, reservedClassNames)));
    declarations.push(builders.declaration("block-interface-index", style.index.toString()));
    let aliasValues = new Array(...style.getStyleAliases());
    if (aliasValues.length) {
      declarations.push(builders.declaration("block-alias", aliasValues.join(" ")));
    }
    return builders.rule(selectors, declarations);
  }

  blockReferences(root: postcss.Root, block: Block): void {
    block.eachBlockReference((name, _block) => {
      root.append(postcss.atRule({name: "block", params: `${name} from ""`}));
    });
  }

  insertReference(css: postcss.Root, definitionPath: string) {
    let comment = this.postcss.comment({text: `#blockDefinitionURL=${definitionPath}`});
    Object.assign(comment.raws, {left: "", right: ""});
    css.append(comment);
  }

  insertInlineReference(_css: postcss.Root, _definition: postcss.Root) {
    throw new Error("Method not implemented.");
  }
}
