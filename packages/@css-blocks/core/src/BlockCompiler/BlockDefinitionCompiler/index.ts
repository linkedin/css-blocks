import { Dictionary } from "async";
import { postcss } from "opticss";

import { AttributeSelector, ClassSelector, Declaration, DefinitionAST, DefinitionRoot, GlobalDeclaration, KeyCompoundSelector, Mapper, Name, Rename, Rule, ScopeSelector, Selector, builders, map as mapToDefinition, visit } from "../../BlockParser/ast";
import { AttrValue, Block, BlockClass, Style, isAttrValue, isBlockClass } from "../../BlockTree";
import { ResolvedConfiguration } from "../../configuration";

import { PostcssASTBuilder } from "./PostcssASTBuilder";
import { CompiledDefinitionMapper, PathResolver } from "./CompiledDefinitionMapper";

export { PathResolver } from "./CompiledDefinitionMapper";

export const INLINE_DEFINITION_FILE = Symbol("Inline Definition");

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
    let visitor = new PostcssASTBuilder(this.postcss);
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
      // TODO: inherited-styles
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
   * The complex compositions which apply to the intersection of more than one
   * attribute require the generation of ruleset that targets all of those
   * attributes together.
   *
   * Note: Simple compositions (which apply to a single block class or
   * attribute) are processed when we generate the rule for that style.
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
