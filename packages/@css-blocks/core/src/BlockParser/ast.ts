import { assertNever } from "@opticss/util";
export type AnySelector<isDefinition extends DefinitionAST | BlockAST> =
  ComplexSelector<isDefinition>
  | ContextCompoundSelector<isDefinition>
  | KeyCompoundSelector<isDefinition>
  | ScopeSelector
  | ClassSelector
  | AttributeSelector
  | ForeignAttributeSelector
  | PseudoClassSelector
  | PseudoElementSelector;
export type TopLevelNode<isDefinition extends DefinitionAST | BlockAST> = BlockSyntaxVersion | BlockReference | LocalBlockExport | BlockExport | Rule<isDefinition> | GlobalDeclaration;
export type Node<isDefinition extends DefinitionAST | BlockAST> =
  Root<isDefinition>
  | TopLevelNode<isDefinition>
  | AnySelector<isDefinition>
  | Declaration;

const NODE_TYPES = new Set<Node<BlockAST>["type"]>();

export interface Name {
  name: string;
  asName?: undefined;
}

export interface Rename {
  name: string;
  asName: string;
}

export interface Root<isDefinition extends DefinitionAST | BlockAST = BlockAST> {
  type: "Root";
  children: Array<TopLevelNode<isDefinition>>;
}
NODE_TYPES.add("Root");

export type DefinitionAST = "definition";
export type BlockAST = "block";
export type DefinitionRoot = Root<DefinitionAST>;

export interface BlockSyntaxVersion {
  type: "BlockSyntaxVersion";
  version: number;
}
NODE_TYPES.add("BlockSyntaxVersion");

export interface BlockReference {
  type: "BlockReference";
  references?: Array<Name | Rename>;
  defaultName?: string;
  fromPath: string;
}
NODE_TYPES.add("BlockReference");

/* The statement that exports a block that was previously imported via `@block` */
export interface LocalBlockExport {
  type: "LocalBlockExport";
  exports: Array<Name | Rename>;
}
NODE_TYPES.add("LocalBlockExport");

/* The statement that exports a block that was previously imported via `@block` */
export interface BlockExport {
  type: "BlockExport";
  exports: Array<Name | Rename>;
  fromPath: string;
}
NODE_TYPES.add("BlockExport");

export type KeyCompoundSelector<isDefinition extends DefinitionAST | BlockAST> = CompoundSelector<isDefinition, AttributeSelector, PseudoClassSelector, PseudoElementSelector>;
export type ContextCompoundSelector<isDefinition extends DefinitionAST | BlockAST> = CompoundSelector<isDefinition, ForeignAttributeSelector | AttributeSelector, PseudoClassSelector, never>;
export type ElementSelector = ScopeSelector | ClassSelector;
export type Selector<isDefinition extends DefinitionAST | BlockAST> = ElementSelector | KeyCompoundSelector<isDefinition> | ComplexSelector<isDefinition>;

export interface PseudoElementSelector {
  type: "PseudoElementSelector";
  /** The name of the psuedoelement without the `::` at the beginning. */
  name: string;
}
NODE_TYPES.add("PseudoElementSelector");

export interface PseudoClassSelector {
  type: "PseudoClassSelector";
  /** The name of the psuedoclass without the `:` at the beginning. */
  name: string;
}
NODE_TYPES.add("PseudoClassSelector");

export interface SelectorAndCombinator<isDefinition extends DefinitionAST | BlockAST> {
  selector: ContextCompoundSelector<isDefinition>;
  combinator: " " | ">" | "+" | "~";
}

export interface ComplexSelector<isDefinition extends DefinitionAST | BlockAST> {
  type: "ComplexSelector";
  /** There should be at least one context selector. */
  contextSelectors: Array<SelectorAndCombinator<isDefinition>>;
  keySelector: KeyCompoundSelector<isDefinition>;
}
NODE_TYPES.add("ComplexSelector");

export interface CompoundSelector<
  isDefinition extends DefinitionAST | BlockAST,
  AttributeSelectorType extends ForeignAttributeSelector | AttributeSelector,
  PseudoClassType extends PseudoClassSelector | never,
  PseudoElementType extends PseudoElementSelector | never,
> {
  type: "CompoundSelector";
  element: ElementSelector;
  attributes?: Array<AttributeSelectorType>;
  elementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : (PseudoClassType extends never ? undefined : Array<PseudoClassType>);
  pseudoElement?: PseudoElementType;
  pseudoElementPseudoClasses?: isDefinition extends DefinitionAST
                               ? undefined
                               : (PseudoElementSelector extends never
                                  ? undefined
                                  : (PseudoClassType extends never ? undefined : Array<PseudoClassType>));
}
NODE_TYPES.add("CompoundSelector");

export interface ForeignAttributeSelector {
  type: "ForeignAttributeSelector";
  ns: string;
  attribute: string;
  matches?: {
    matcher: "=";
    value: string;
  };
}
NODE_TYPES.add("ForeignAttributeSelector");

export interface AttributeSelector {
  type: "AttributeSelector";
  ns?: undefined;
  attribute: string;
  matches?: {
    matcher: "=";
    value: string;
  };
}
NODE_TYPES.add("AttributeSelector");

export interface ScopeSelector {
  type: "ScopeSelector";
  value: ":scope";
}
NODE_TYPES.add("ScopeSelector");

export interface ClassSelector {
  type: "ClassSelector";
  /** The name of the class without the `.` at the beginning. */
  name: string;
}
NODE_TYPES.add("ClassSelector");

export interface Declaration {
  type: "Declaration";
  property: string;
  value: string;
}
NODE_TYPES.add("Declaration");

export interface Rule<isDefinition extends DefinitionAST | BlockAST> {
  type: "Rule";
  selectors: Array<Selector<isDefinition>>;
  declarations: Array<Declaration>;
}
NODE_TYPES.add("Rule");

export interface GlobalDeclaration {
  type: "GlobalDeclaration";
  selector: AttributeSelector;
}
NODE_TYPES.add("GlobalDeclaration");

export namespace typeguards {
  export function isNode<isDefinition extends DefinitionAST | BlockAST>(node: unknown): node is Node<isDefinition> {
    return typeof node === "object"
           && node !== null
           && typeof (<Node<isDefinition>>node).type === "string"
           && NODE_TYPES.has((<Node<isDefinition>>node).type);
  }
  export function isRoot<isDefinition extends DefinitionAST | BlockAST>(node: unknown): node is Root<isDefinition> {
    return typeguards.isNode(node) && node.type === "Root";
  }
  export function isBlockSyntaxVersion(node: unknown): node is BlockSyntaxVersion {
    return typeguards.isNode(node) && node.type === "BlockSyntaxVersion";
  }
  export function isBlockReference(node: unknown): node is BlockReference {
    return typeguards.isNode(node) && node.type === "BlockReference";
  }
  export function isBlockExport(node: unknown): node is BlockExport {
    return typeguards.isNode(node) && node.type === "BlockExport";
  }
  export function isLocalBlockExport(node: unknown): node is LocalBlockExport {
    return typeguards.isNode(node) && node.type === "LocalBlockExport";
  }
  export function isPseudoElementSelector(node: unknown): node is PseudoElementSelector {
    return typeguards.isNode(node) && node.type === "PseudoElementSelector";
  }
  export function isPseudoClassSelector(node: unknown): node is PseudoClassSelector {
    return typeguards.isNode(node) && node.type === "PseudoClassSelector";
  }
  export function isComplexSelector<isDefinition extends DefinitionAST | BlockAST>(node: unknown): node is ComplexSelector<isDefinition> {
    return typeguards.isNode(node) && node.type === "ComplexSelector";
  }
  export function isCompoundSelector<isDefinition extends DefinitionAST | BlockAST>(node: unknown): node is KeyCompoundSelector<isDefinition> | ContextCompoundSelector<isDefinition> {
    return typeguards.isNode(node) && node.type === "CompoundSelector";
  }
  export function isAttributeSelector(node: unknown): node is AttributeSelector {
    return typeguards.isNode(node) && node.type === "AttributeSelector";
  }
  export function isForeignAttributeSelector(node: unknown): node is ForeignAttributeSelector {
    return typeguards.isNode(node) && node.type === "ForeignAttributeSelector";
  }
  export function isScopeSelector(node: unknown): node is ScopeSelector {
    return typeguards.isNode(node) && node.type === "ScopeSelector";
  }
  export function isClassSelector(node: unknown): node is ClassSelector {
    return typeguards.isNode(node) && node.type === "ClassSelector";
  }
  export function isDeclaration(node: unknown): node is Declaration {
    return typeguards.isNode(node) && node.type === "Declaration";
  }
  export function isRule<isDefinition extends DefinitionAST | BlockAST>(node: unknown): node is Rule<isDefinition> {
    return typeguards.isNode(node) && node.type === "Rule";
  }
  export function isGlobalDeclaration(node: unknown): node is GlobalDeclaration {
    return typeguards.isNode(node) && node.type === "GlobalDeclaration";
  }
}

export namespace builders {
  export function root<isDefinition extends DefinitionAST | BlockAST>(children: Array<TopLevelNode<isDefinition>> = []): Root<isDefinition> {
    return {
      type: "Root",
      children,
    };
  }

  export function blockSyntaxVersion(version: number): BlockSyntaxVersion {
    return {
      type: "BlockSyntaxVersion",
      version,
    };
  }

  export function blockReference(fromPath: string, defaultName: string | undefined, references: Array<Name | Rename> | undefined): BlockReference {
    return {
      type: "BlockReference",
      fromPath,
      defaultName,
      references,
    };
  }

  export function localBlockExport(exports: Array<Name | Rename>): LocalBlockExport {
    return {
      type: "LocalBlockExport",
      exports,
    };
  }

  export function blockExport(fromPath: string, exports: Array<Name | Rename>): BlockExport {
    return {
      type: "BlockExport",
      fromPath,
      exports,
    };
  }

  export function pseudoElementSelector(name: string): PseudoElementSelector {
    return {
      type: "PseudoElementSelector",
      name,
    };
  }
  export function pseudoClassSelector(name: string): PseudoClassSelector {
    return {
      type: "PseudoClassSelector",
      name,
    };
  }
  export function complexSelector<isDefinition extends DefinitionAST | BlockAST>(contextSelectors: Array<SelectorAndCombinator<isDefinition>>, keySelector: KeyCompoundSelector<isDefinition>): ComplexSelector<isDefinition> {
    if (contextSelectors.length === 0) {
      throw new Error("At least one context selector is required to build a complex selector.");
    }
    return {
      type: "ComplexSelector",
      keySelector,
      contextSelectors,
    };
  }
  export function compoundSelector<isDefinition extends DefinitionAST | BlockAST>(
    element: ElementSelector,
    attributes?: Array<ForeignAttributeSelector | AttributeSelector>,
    elementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
    pseudoElement?: PseudoElementSelector,
    pseudoElementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
  ): CompoundSelector<isDefinition, AttributeSelector | ForeignAttributeSelector, PseudoClassSelector, PseudoElementSelector> {
    return {
      type: "CompoundSelector",
      element,
      attributes,
      elementPseudoClasses,
      pseudoElement,
      pseudoElementPseudoClasses,
    };
  }
  export function keyCompoundSelector<isDefinition extends DefinitionAST | BlockAST>(
    element: ElementSelector,
    attributes?: Array<AttributeSelector>,
    elementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
    pseudoElement?: PseudoElementSelector,
    pseudoElementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
  ): KeyCompoundSelector<isDefinition> {
    return {
      type: "CompoundSelector",
      element,
      attributes,
      elementPseudoClasses,
      pseudoElement,
      pseudoElementPseudoClasses,
    };
  }
  export function contextCompoundSelector<isDefinition extends DefinitionAST | BlockAST>(
    element: ElementSelector,
    attributes?: Array<ForeignAttributeSelector | AttributeSelector>,
    elementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
    pseudoElementPseudoClasses?: isDefinition extends DefinitionAST ? undefined : Array<PseudoClassSelector>,
  ): ContextCompoundSelector<isDefinition> {
    return {
      type: "CompoundSelector",
      element,
      attributes,
      elementPseudoClasses,
      pseudoElementPseudoClasses,
    };
  }
  export function attributeSelector(attribute: string, value?: string): AttributeSelector {
    let attrSelector: AttributeSelector = {
      type: "AttributeSelector",
      attribute,
    };
    if (value) {
      attrSelector.matches = { matcher: "=", value };
    }
    return attrSelector;
  }
  export function foreignAttributeSelector(ns: string, attribute: string, value?: string): ForeignAttributeSelector {
    let attrSelector: ForeignAttributeSelector = {
      type: "ForeignAttributeSelector",
      ns,
      attribute,
    };
    if (value) {
      attrSelector.matches = { matcher: "=", value };
    }
    return attrSelector;
  }
  export function scopeSelector(): ScopeSelector {
    return {
      type: "ScopeSelector",
      value: ":scope",
    };
  }
  export function classSelector(name: string): ClassSelector {
    return {
      type: "ClassSelector",
      name,
    };
  }
  export function declaration(property: string, value: string): Declaration {
    return {
      type: "Declaration",
      property,
      value,
    };
  }
  export function rule<isDefinition extends DefinitionAST | BlockAST>(selectors: Array<Selector<isDefinition>>, declarations: Array<Declaration>): Rule<isDefinition> {
    return {
      type: "Rule",
      selectors,
      declarations,
    };
  }
  export function globalDeclaration(selector: AttributeSelector): GlobalDeclaration {
    return {
      type: "GlobalDeclaration",
      selector,
    };
  }
}

export interface Visitor<isDefinition extends DefinitionAST | BlockAST> {
  Root?(root: Root<isDefinition>): void | boolean | undefined;
  BlockSyntaxVersion?(blockSyntaxVersion: BlockSyntaxVersion): void | boolean | undefined;
  BlockReference?(blockReference: BlockReference): void | boolean | undefined;
  LocalBlockExport?(localBlockExport: LocalBlockExport): void | boolean | undefined;
  BlockExport?(blockExport: BlockExport): void | boolean | undefined;
  PseudoElementSelector?(pseudoElementSelector: PseudoElementSelector): void | boolean | undefined;
  PseudoClassSelector?(pseudoClassSelector: PseudoClassSelector): void | boolean | undefined;
  ComplexSelector?(complexSelector: ComplexSelector<isDefinition>): void | boolean | undefined;
  CompoundSelector?(compoundSelector: KeyCompoundSelector<isDefinition> | ContextCompoundSelector<isDefinition>): void | boolean | undefined;
  AttributeSelector?(attributeSelector: AttributeSelector): void | boolean | undefined;
  ForeignAttributeSelector?(foreignAttributeSelector: ForeignAttributeSelector): void | boolean | undefined;
  ScopeSelector?(scopeSelector: ScopeSelector): void | boolean | undefined;
  ClassSelector?(classSelector: ClassSelector): void | boolean | undefined;
  Declaration?(declaration: Declaration): void | boolean | undefined;
  Rule?(rule: Rule<isDefinition>): void | boolean | undefined;
  GlobalDeclaration?(globalDeclaration: GlobalDeclaration): void | boolean | undefined;
}

export interface Mapper<
  isToDefinition extends DefinitionAST | BlockAST
> {
  Root?(children: Array<TopLevelNode<isToDefinition>>): Root<isToDefinition>;
  BlockSyntaxVersion?(version: number): BlockSyntaxVersion;
  BlockReference?(fromPath: string, defaultName: string | undefined, references: Array<Name | Rename> | undefined): BlockReference;
  LocalBlockExport?(exports: Array<Name | Rename>): LocalBlockExport;
  BlockExport?(fromPath: string, exports: Array<Name | Rename>): BlockExport;
  PseudoElementSelector?(name: string): PseudoElementSelector;
  PseudoClassSelector?(name: string): PseudoClassSelector;
  ComplexSelector?(contextSelectors: Array<SelectorAndCombinator<isToDefinition>>, keySelector: KeyCompoundSelector<isToDefinition>): ComplexSelector<isToDefinition>;
  CompoundSelector?(
    element: ElementSelector,
    attributes?: Array<AttributeSelector | ForeignAttributeSelector>,
    elementPseudoClasses?: Array<PseudoClassSelector>,
    pseudoElement?: PseudoElementSelector,
    pseudoElementPseudoClasses?: Array<PseudoClassSelector>,
  ): KeyCompoundSelector<isToDefinition> | ContextCompoundSelector<isToDefinition>;
  AttributeSelector?(attribute: string, value?: string): AttributeSelector;
  ForeignAttributeSelector?(ns: string, attribute: string, value?: string): ForeignAttributeSelector;
  ScopeSelector?(): ScopeSelector;
  ClassSelector?(name: string): ClassSelector;
  Declaration?(property: string, value: string): Declaration;
  Rule?(selectors: Array<Selector<isToDefinition>>, declarations: Array<Declaration>): Rule<isToDefinition>;
  GlobalDeclaration?(selector: AttributeSelector): GlobalDeclaration;
}

export function map<
  isFromDefinition extends DefinitionAST | BlockAST,
  isToDefinition extends DefinitionAST | BlockAST,
  N extends Node<isFromDefinition>,
>(mapper: Mapper<isToDefinition>, node: N, fromType: isFromDefinition, toType: isToDefinition,
): N extends Root<isFromDefinition> ? Root<isToDefinition> :
                                            (N extends Rule<isFromDefinition> ? Rule<isToDefinition> :
                                             (N extends ComplexSelector<isFromDefinition> ? ComplexSelector<isToDefinition> :
                                              (N extends ContextCompoundSelector<isFromDefinition> ? ContextCompoundSelector<isToDefinition> :
                                               (N extends KeyCompoundSelector<isFromDefinition> ? KeyCompoundSelector<isToDefinition> : N)))) {
  if (typeguards.isRoot<isFromDefinition>(node)) {
    let children: Array<TopLevelNode<isToDefinition>> = [];
    for (let child of node.children) {
      let c: TopLevelNode<isToDefinition> = map(mapper, child, fromType, toType);
      children.push(c);
    }
    let ret: Root<isToDefinition>;
    if (mapper.Root) {
      ret = mapper.Root(children);
    } else {
      ret = builders.root(children);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isBlockSyntaxVersion(node)) {
    let ret: BlockSyntaxVersion;
    if (mapper.BlockSyntaxVersion) {
      ret = mapper.BlockSyntaxVersion(node.version);
    } else {
      ret = builders.blockSyntaxVersion(node.version);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isBlockReference(node)) {
    let references: BlockReference["references"] | undefined;
    if (node.references) {
      references = [];
      for (let ref of node.references) {
        references.push(Object.assign({}, ref));
      }
    }
    let ret: BlockReference;
    if (mapper.BlockReference) {
      ret = mapper.BlockReference(node.fromPath, node.defaultName, references);
    } else {
      ret = builders.blockReference(node.fromPath, node.defaultName, references);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isBlockExport(node)) {
    let exports: BlockExport["exports"] = [];
    for (let e of node.exports) {
      exports.push(Object.assign({}, e));
    }
    let ret: BlockExport;
    if (mapper.BlockExport) {
      ret = mapper.BlockExport(node.fromPath, exports);
    } else {
      ret = builders.blockExport(node.fromPath, exports);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isLocalBlockExport(node)) {
    let exports: LocalBlockExport["exports"] = [];
    for (let e of node.exports) {
      exports.push(Object.assign({}, e));
    }
    let ret: LocalBlockExport;
    if (mapper.LocalBlockExport) {
      ret = mapper.LocalBlockExport(exports);
    } else {
      ret = builders.localBlockExport(exports);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isComplexSelector<isFromDefinition>(node)) {
    let contextSelectors: ComplexSelector<isToDefinition>["contextSelectors"] = [];
    for (let ctx of node.contextSelectors) {
      contextSelectors.push({selector: map(mapper, ctx.selector, fromType, toType), combinator: ctx.combinator});
    }
    let keySelector = map(mapper, node.keySelector, fromType, toType);
    let ret: ComplexSelector<isToDefinition>;
    if (mapper.ComplexSelector) {
      ret = mapper.ComplexSelector(contextSelectors, keySelector);
    } else {
      ret = builders.complexSelector(contextSelectors, keySelector);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isForeignAttributeSelector(node)) {
    let {ns, attribute, matches} = node;
    let value = matches ? matches.value : undefined;
    let ret: ForeignAttributeSelector;
    if (mapper.ForeignAttributeSelector) {
      ret = mapper.ForeignAttributeSelector(ns, attribute, value);
    } else {
      ret = builders.foreignAttributeSelector(ns, attribute, value);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isAttributeSelector(node)) {
    let {attribute, matches} = node;
    let value = matches ? matches.value : undefined;
    let ret: AttributeSelector;
    if (mapper.AttributeSelector) {
      ret = mapper.AttributeSelector(attribute, value);
    } else {
      ret = builders.attributeSelector(attribute, value);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isCompoundSelector<isFromDefinition>(node)) {
    let element = map(mapper, node.element, fromType, toType);
    let attributes: Array<ForeignAttributeSelector | AttributeSelector> | undefined;
    // []
    if (node.attributes) {
      attributes = [];
      for (let attr of node.attributes) { attributes.push(map(mapper, attr, fromType, toType)); }
    }
    let elementPseudoClasses: Array<PseudoClassSelector> | undefined;
    if (node.elementPseudoClasses && toType === "block") {
      elementPseudoClasses = [];
      for (let pseudoclass of <Array<PseudoClassSelector>>node.elementPseudoClasses) { elementPseudoClasses.push(map(mapper, pseudoclass, fromType, toType)); }
    }
    let psuedoElement: PseudoElementSelector | undefined;
    if (node.pseudoElement) {
      psuedoElement = map(mapper, node.pseudoElement, fromType, toType);
    }
    let pseudoElementPseudoClasses: Array<PseudoClassSelector> | undefined;
    if (node.pseudoElementPseudoClasses) {
      pseudoElementPseudoClasses = [];
      for (let pseudoclass of <Array<PseudoClassSelector>>node.pseudoElementPseudoClasses) { pseudoElementPseudoClasses.push(map(mapper, pseudoclass, fromType, toType)); }
    }
    let ret: CompoundSelector<isToDefinition, ForeignAttributeSelector | AttributeSelector, PseudoClassSelector, PseudoElementSelector>;
    if (mapper.CompoundSelector) {
      ret = mapper.CompoundSelector(element, attributes, elementPseudoClasses, psuedoElement, pseudoElementPseudoClasses);
    } else {
      // tslint:disable-next-line:prefer-unknown-to-any
      ret = builders.compoundSelector(element, attributes, <any>elementPseudoClasses, psuedoElement, <any>pseudoElementPseudoClasses);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isScopeSelector(node)) {
    let ret: ScopeSelector;
    if (mapper.ScopeSelector) {
      ret = mapper.ScopeSelector();
    } else {
      ret = builders.scopeSelector();
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isClassSelector(node)) {
    let ret: ClassSelector;
    if (mapper.ClassSelector) {
      ret = mapper.ClassSelector(node.name);
    } else {
      ret = builders.classSelector(node.name);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isPseudoClassSelector(node)) {
    let ret: PseudoClassSelector;
    if (mapper.PseudoClassSelector) {
      ret = mapper.PseudoClassSelector(node.name);
    } else {
      ret = builders.pseudoClassSelector(node.name);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isPseudoElementSelector(node)) {
    let ret: PseudoElementSelector;
    if (mapper.PseudoElementSelector) {
      ret = mapper.PseudoElementSelector(node.name);
    } else {
      ret = builders.pseudoElementSelector(node.name);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isRule(node)) {
    let selectors: Rule<isToDefinition>["selectors"] = [];
    for (let sel of node.selectors) {
      selectors.push(map(mapper, sel, fromType, toType));
    }
    let declarations: Rule<isToDefinition>["declarations"] = [];
    for (let decl of node.declarations) {
      declarations.push(map(mapper, decl, fromType, toType));
    }
    let ret: Rule<isToDefinition>;
    if (mapper.Rule) {
      ret = mapper.Rule(selectors, declarations);
    } else {
      ret = builders.rule(selectors, declarations);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isDeclaration(node)) {
    let ret: Declaration;
    if (mapper.Declaration) {
      ret = mapper.Declaration(node.property, node.value);
    } else {
      ret = builders.declaration(node.property, node.value);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else if (typeguards.isGlobalDeclaration(node)) {
    let selector = map(mapper, node.selector, fromType, toType);
    let ret: GlobalDeclaration;
    if (mapper.GlobalDeclaration) {
      ret = mapper.GlobalDeclaration(selector);
    } else {
      ret = builders.globalDeclaration(selector);
    }
    // tslint:disable-next-line:prefer-unknown-to-any
    return <any>ret;
  } else {
    throw new Error("internal error");
  }
}

export function visit<isDefinition extends DefinitionAST | BlockAST>(visitor: Visitor<isDefinition>, node: Node<isDefinition>): void {
  if (typeguards.isRoot(node)) {
    if (visitor.Root) {
      let result = visitor.Root(node);
      if (result === false) return;
    }
    for (let child of node.children) {
      visit(visitor, child);
    }
  } else if (typeguards.isBlockSyntaxVersion(node)) {
    if (visitor.BlockSyntaxVersion) {
      let result = visitor.BlockSyntaxVersion(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isBlockReference(node)) {
    if (visitor.BlockReference) {
      let result = visitor.BlockReference(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isBlockExport(node)) {
    if (visitor.BlockExport) {
      let result = visitor.BlockExport(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isLocalBlockExport(node)) {
    if (visitor.LocalBlockExport) {
      let result = visitor.LocalBlockExport(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isComplexSelector(node)) {
    if (visitor.ComplexSelector) {
      let result = visitor.ComplexSelector(node);
      if (result === false) {
        return;
      }
    }
    for (let ctx of node.contextSelectors) {
      visit(visitor, ctx.selector);
    }
    visit(visitor, node.keySelector);
  } else if (typeguards.isForeignAttributeSelector(node)) {
    if (visitor.ForeignAttributeSelector) {
      let result = visitor.ForeignAttributeSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isAttributeSelector(node)) {
    if (visitor.AttributeSelector) {
      let result = visitor.AttributeSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isCompoundSelector(node)) {
    if (visitor.CompoundSelector) {
      let result = visitor.CompoundSelector(node);
      if (result === false) {
        return;
      }
    }
    visit(visitor, node.element);
    if (node.attributes) {
      for (let attr of node.attributes) { visit(visitor, attr); }
    }
    if (node.elementPseudoClasses) {
      for (let pseudoclass of <Array<PseudoClassSelector>>node.elementPseudoClasses) { visit(visitor, pseudoclass); }
    }
    if (node.pseudoElement) {
      visit(visitor, node.pseudoElement);
    }
    if (node.pseudoElementPseudoClasses) {
      for (let pseudoclass of <Array<PseudoClassSelector>>node.pseudoElementPseudoClasses) { visit(visitor, pseudoclass); }
    }
  } else if (typeguards.isScopeSelector(node)) {
    if (visitor.ScopeSelector) {
      let result = visitor.ScopeSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isClassSelector(node)) {
    if (visitor.ClassSelector) {
      let result = visitor.ClassSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isPseudoClassSelector(node)) {
    if (visitor.PseudoClassSelector) {
      let result = visitor.PseudoClassSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isPseudoElementSelector(node)) {
    if (visitor.PseudoElementSelector) {
      let result = visitor.PseudoElementSelector(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isRule(node)) {
    if (visitor.Rule) {
      let result = visitor.Rule(node);
      if (result === false) {
        return;
      }
    }
    for (let sel of node.selectors) {
      visit(visitor, sel);
    }
    for (let decl of node.declarations) {
      visit(visitor, decl);
    }
  } else if (typeguards.isDeclaration(node)) {
    if (visitor.Declaration) {
      let result = visitor.Declaration(node);
      if (result === false) {
        return;
      }
    }
  } else if (typeguards.isGlobalDeclaration(node)) {
    if (visitor.GlobalDeclaration) {
      let result = visitor.GlobalDeclaration(node);
      if (result === false) {
        return;
      }
    }
    visit(visitor, node.selector);
  } else {
    assertNever(node);
  }
}
