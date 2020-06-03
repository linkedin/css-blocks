import { Dictionary } from "async";
import { postcss } from "opticss";

import { AttributeSelector, BlockExport, BlockReference, BlockSyntaxVersion, ClassSelector, Declaration, DefinitionAST, DefinitionRoot, ForeignAttributeSelector, GlobalDeclaration, KeyCompoundSelector, LocalBlockExport, Mapper, Name, Rename, Rule, ScopeSelector, Selector, Visitor, builders, map as mapToDefinition, visit } from "../BlockParser/ast";
import { BLOCK_GLOBAL } from "../BlockSyntax";
import { AttrValue, Block, BlockClass, Style, isAttrValue, isBlockClass } from "../BlockTree";
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
    definitionRoot.children.push(...this.complexCompositions(block));
    return definitionRoot;
  }

  styleToRule(style: Style, reservedClassNames: Set<string>): Rule<DefinitionAST> {
    let selectors = new Array<Selector<DefinitionAST>>();
    let blockClass: BlockClass = isAttrValue(style) ? style.blockClass : style;
    if (isAttrValue(style)) {
      selectors.push(attributeSelectors(blockClass, [style]));
    } else {
      selectors.push(elementSelector(blockClass));
    }
    let declarations = new Array<Declaration>();
    if (isBlockClass(style) && style.isRoot) {
      declarations.push(builders.declaration("block-id", `"${style.block.guid}"`));
      declarations.push(builders.declaration("block-name", `"${style.block.name}"`));
    }

    let compositions = new Array<string>();
    for (let composition of blockClass.composedStyles()) {
      if (composition.conditions.length === 0 && blockClass === style) {
        compositions.push(composition.path);
      } else if (composition.conditions.length === 1 && composition.conditions[0] === style) {
        compositions.push(composition.path);
      }
    }
    if (compositions.length > 0) {
      declarations.push(builders.declaration("composes", compositions.join(", ")));
    }
    declarations.push(builders.declaration("block-class", style.cssClass(this.config, reservedClassNames)));
    declarations.push(builders.declaration("block-interface-index", style.index.toString()));
    let aliasValues = new Array(...style.getStyleAliases());
    if (aliasValues.length) {
      declarations.push(builders.declaration("block-alias", aliasValues.join(" ")));
    }
    return builders.rule(selectors, declarations);
  }
  /**
   * Simple compositions (which apply to a single block class or attribute) are
   * processed when we generate the rule for that style. The complex
   * compositions which apply to the intersection of more than one attribute
   * require the generation of ruleset that targets all of those attributes
   * together.
   */
  complexCompositions(block: Block): Array<Rule<DefinitionAST>> {
    let complexCompositions: Dictionary<{ blockClass: BlockClass; attributes: AttrValue[]; paths: Array<string> }> = {};
    for (let blockClass of block.classes) {
      // Compositions can have any number of attributes and we need to collate the
      // styles being composed for each unique set of attributes. To do this, we
      // generate a unique key for each unique set of attributes and store the data
      // we need against it.
      for (let composition of blockClass.composedStyles()) {
        if (composition.conditions.length > 1) {
          let key = composition.conditions.map(c => c.index).sort().join(" ");
          if (!complexCompositions[key]) {
            complexCompositions[key] = {
              blockClass,
              attributes: composition.conditions,
              paths: [composition.path],
            };
          } else {
            complexCompositions[key].paths.push(composition.path);
          }
        }
      }
    }
    // once we've collated all the compositions by the attributes we generate
    // a rule for each distinct set of attributes and put a composes declaration
    // in it.
    let rules = new Array<Rule<DefinitionAST>>();
    for (let key of Object.keys(complexCompositions)) {
      let composition = complexCompositions[key];
      let selector = attributeSelectors(composition.blockClass, composition.attributes);
      let declarations = new Array<Declaration>();
      declarations.push(builders.declaration("composes", composition.paths.join(", ")));
      rules.push(builders.rule([selector], declarations));
    }
    return rules;
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

function elementSelector(blockClass: BlockClass): ClassSelector | ScopeSelector {
  if (blockClass.isRoot) {
    return builders.scopeSelector();
  } else {
    return builders.classSelector(blockClass.name);
  }
}

function attributeSelectors(blockClass: BlockClass, attributes: Array<AttrValue>): KeyCompoundSelector<DefinitionAST> {
  let attributeSelectors = new Array<AttributeSelector>();
  for (let style of attributes) {
    if (style.isPresenceRule) {
      attributeSelectors.push(builders.attributeSelector(style.attribute.name));
    } else {
      attributeSelectors.push(builders.attributeSelector(style.attribute.name, style.value));
    }
  }
  return builders.keyCompoundSelector(elementSelector(blockClass), attributeSelectors);
}
