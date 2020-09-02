import {
  Attribute,
  Block,
  Configuration as CSSBlocksConfiguration,
  Style,
  isFalseCondition,
  isTrueCondition,
} from "@css-blocks/core";
import { EmberAnalysis, HandlebarsTemplate, TEMPLATE_TYPE } from "@css-blocks/ember-utils";
import type {
  AST,
  ASTPlugin,
  NodeVisitor,
  Syntax,
} from "@glimmer/syntax";
import { assertNever } from "@opticss/util";
import * as debugGenerator from "debug";
import * as path from "path";

import { ElementAnalyzer, StringExpression as StringAST, TemplateElement, isStyleOfHelper } from "./ElementAnalyzer";
import { getEmberBuiltInStates, isEmberBuiltIn, isEmberBuiltInNode } from "./EmberBuiltins";
import { BlockRef, BooleanStyle, FalsySwitchBehavior, RuntimeStyles, StyleRef, SwitchStyle, TernaryStyle } from "./RuntimeStyle";
import { cssBlockError, isConcatStatement, isMustacheStatement, isPathExpression, isStringLiteral, isSubExpression, isTextNode, pathString } from "./utils";

export const CONCAT_HELPER_NAME = "-css-blocks-concat";

const NOOP_VISITOR = {};
const DEBUG = debugGenerator("css-blocks:glimmer:analyzing-rewriter");

export interface ASTPluginWithDeps extends ASTPlugin {
  /**
   * If this method exists, it is called with the relative path to the current
   * file just before processing starts. Use this method to reset the
   * dependency tracking state associated with the file.
   */
  resetDependencies?(relativePath: string): void;
  /**
   * This method is called just as the template finishes being processed.
   *
   * @param relativePath A relative path to the file that may have dependencies.
   * @return paths to files that are a dependency for the given
   * file. Any relative paths returned by this method are taken to be relative
   * to the file that was processed.
   */
  dependencies?(relativePath: string): string[];
}

type ElementSourceAnalysis = ReturnType<TemplateElement["getSourceAnalysis"]>;

export class TemplateAnalyzingRewriter implements ASTPluginWithDeps {
  visitor: NodeVisitor;
  visitors: NodeVisitor;
  elementCount: number;
  template: HandlebarsTemplate;
  block: Block | null | undefined;
  syntax: Syntax;
  elementAnalyzer: ElementAnalyzer<TEMPLATE_TYPE>;
  cssBlocksOpts: CSSBlocksConfiguration;
  helperInvocation: HelperInvocationGenerator;

  constructor(template: HandlebarsTemplate, block: Block | undefined | null, analysis: EmberAnalysis, options: CSSBlocksConfiguration, syntax: Syntax) {
    this.elementCount = 0;
    this.template = template;
    this.block = block;
    this.syntax = syntax;
    this.elementAnalyzer = new ElementAnalyzer(analysis, options);
    this.cssBlocksOpts = options;
    this.helperInvocation = new HelperInvocationGenerator(syntax.builders);
    if (this.block) {
      this.visitor = {
        ElementNode: this.ElementNode.bind(this),
        SubExpression: this.HelperStatement.bind(this),
        MustacheStatement: this.HelperStatement.bind(this),
        BlockStatement: this.HelperStatement.bind(this),
      };
    } else {
      this.visitor = NOOP_VISITOR;
    }
    this.visitors = this.visitor;
    if (block) {
      block.eachBlockExport(analysis.addBlock.bind(analysis));
    }
  }
  debug(message: string, ...args: unknown[]): void {
    DEBUG(`${this.template}: ${message}`, ...args);
  }

  get name(): string { return this.block ? "css-blocks-glimmer-rewriter" : "css-blocks-noop"; }

  /**
   * @param relativePath the relative path to the template starting at the root
   * of the input tree.
   * @returns Files this template file depends on.
   */
  dependencies(relativePath: string): Array<string> {
    this.debug("Getting dependencies for", relativePath);
    if (!this.block) return [];

    let deps: Set<string> = new Set();
    let importer = this.cssBlocksOpts.importer;
    for (let block of [this.block, ...this.block.transitiveBlockDependencies()]) {
      // TODO: Figure out why the importer is returning null here.
      let blockFile = importer.filesystemPath(block.identifier, this.cssBlocksOpts);

      this.debug("block file path is", blockFile);
      if (blockFile) {
        if (!path.isAbsolute(blockFile)) {
          // this isn't actually relative to the rootDir but it doesn't matter
          // because the shared root directory will be removed by the relative
          // path calculation.
          let templatePath = path.dirname(path.resolve(this.cssBlocksOpts.rootDir, relativePath));
          let blockPath = path.resolve(this.cssBlocksOpts.rootDir, blockFile);
          blockFile = path.relative(templatePath, blockPath);
        }
        deps.add(blockFile);
      }
      // These dependencies happen when additional files get involved via preprocessors.
      for (let additionalDep of block.dependencies) {
        deps.add(additionalDep);
      }
    }
    let depArray = new Array(...deps);
    return depArray;
  }

  HelperStatement(node: AST.MustacheStatement | AST.BlockStatement | AST.SubExpression) {
    if (isEmberBuiltInNode(node)) {
      this.BuiltInStatement(node);
    } else if (isStyleOfHelper(node)) {
      this.StyleOfHelper(node);
    }
  }

  BuiltInStatement(node: AST.MustacheStatement | AST.BlockStatement) {
    this.elementCount++;

    let name = pathString(node);
    if (!isEmberBuiltIn(name)) return;
    const attrToStateMap = getEmberBuiltInStates(name);
    let atRootElement = (this.elementCount === 1);

    const attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);

    // Remove all the source attributes for styles.
    node.hash.pairs = node.hash.pairs.filter(a => this.elementAnalyzer.isAttributeAnalyzed(a.key)[0] === null).filter(a => !attrToStateMap[a.key]);

    for (let attr of Object.keys(attrMap)) {
      let element = attrMap[attr];
      if (element) {
        this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
        let attrValue = this.buildClassValue(true, element);
        let hash = this.syntax.builders.pair(attr, attrValue!);
        node.hash.pairs.push(hash);
      }
    }
  }

  buildClassValue(subExpression: false, analysis: TemplateElement, node?: AST.MustacheStatement): AST.MustacheStatement | AST.ConcatStatement | null;
  buildClassValue(subExpression: true, analysis: TemplateElement, node?: AST.SubExpression): AST.SubExpression | null;
  buildClassValue(subExpression: boolean, analysis: TemplateElement, node?: AST.SubExpression | AST.MustacheStatement): AST.SubExpression | AST.MustacheStatement | AST.ConcatStatement | null {
    const { sexpr, path, mustache } = this.syntax.builders;
    if (subExpression) {
      if (node && !isSubExpression(node)) {
        throw new Error(`Illegal node ${node.type}`);
      } else if (!node) {
        node = sexpr(path(HelperInvocationGenerator.CLASSNAMES_HELPER));
      }
      return this.helperInvocation.build(analysis, node);
    } else {
      if (node && isSubExpression(node)) {
        throw new Error(`Illegal node ${node.type}`);
      } else if (!node) {
        node = mustache(path(HelperInvocationGenerator.CLASSNAMES_HELPER));
      }
      return this.helperInvocation.build(analysis, node);
    }
  }

  StyleOfHelper(node: AST.MustacheStatement | AST.SubExpression): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement, true);
    let attrNames = Object.keys(attrMap);
    if (attrNames.length !== 1 || attrNames[0] !== "class") {
      const names = attrNames.filter(name => name !== "class");
      throw cssBlockError(`Unexpected attribute(s) [${names.join(", ")}] in rewrite for style-of helper.`, node, this.template.relativePath);
    }
    if (isMustacheStatement(node)) {
      this.buildClassValue(false, attrMap["class"], node);
    } else {
      this.buildClassValue(true, attrMap["class"], node);
    }
  }

  ElementNode(node: AST.ElementNode): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);

    // Remove all the source attributes for styles.
    node.attributes = node.attributes.filter(a => this.elementAnalyzer.isAttributeAnalyzed(a.name)[0] === null);

    for (let attrName of Object.keys(attrMap)) {
      let analysis: TemplateElement = attrMap[attrName];
      let attrValue = this.buildClassValue(false, analysis);
      if (!attrValue) continue;
      if (isTextNode(attrValue) && attrValue.chars === "") continue;

      // Add the new attribute.
      // This assumes the class attribute was forbidden. If we ever change
      // that assumption, we must merge with that attribute instead.
      let attr = this.syntax.builders.attr(attrName, attrValue);
      node.attributes.push(attr);
    }
  }
}

class HelperInvocationGenerator {
  static CLASSNAMES_HELPER = "-css-blocks";
  static HELPER_VERSION = 1;

  builders: Syntax["builders"];
  constructor(builders: Syntax["builders"]) {
    this.builders = builders;
  }
  build(analysis: TemplateElement, node: AST.MustacheStatement): AST.MustacheStatement | null;
  build(analysis: TemplateElement, node: AST.SubExpression): AST.SubExpression | null;
  build(analysis: TemplateElement, node: AST.SubExpression | AST.MustacheStatement): AST.SubExpression | AST.MustacheStatement | null {
    const { path, number: num, hash } = this.builders;
    let sourceAnalysis = analysis.getSourceAnalysis();
    if (sourceAnalysis.size() === 0) {
      return null;
    }
    node.path = path(HelperInvocationGenerator.CLASSNAMES_HELPER);
    node.params = [];
    node.hash = hash();
    node.params.push(num(HelperInvocationGenerator.HELPER_VERSION));

    let stylesUsed = new Array<Style>();
    let blocksUsed = new Array<Block>();
    let runtimeParams = new Array<AST.Expression>();
    let staticStyles = this.buildStaticStyles(sourceAnalysis, stylesUsed);
    let booleanStyles = this.buildBooleanStyles(sourceAnalysis, stylesUsed, runtimeParams);
    let ternaryStyles = this.buildTernaryStyles(sourceAnalysis, stylesUsed, runtimeParams);
    let switchStyles = this.buildSwitchStyles(sourceAnalysis, blocksUsed, runtimeParams);
    let styleRefs = this.buildStyleRefs(blocksUsed, stylesUsed);
    let blockRefs = this.buildBlockRefs(blocksUsed);

    let styles: RuntimeStyles = [
      blockRefs,
      styleRefs,
      staticStyles,
      booleanStyles,
      ternaryStyles,
      switchStyles,
    ];

    node.params.push(this.builders.string(JSON.stringify(styles, undefined, 0)));
    node.params.push(...runtimeParams);
    return node;
  }

  buildBlockRefs(blocksUsed: Array<Block>): Array<BlockRef> {
    let blockRefs = new Array<BlockRef>();
    for (let block of blocksUsed) {
      let guid = block.guid;
      let runtimeBlock: number | null = null;
      if (runtimeBlock === null) {
        blockRefs.push([guid]);
      } else {
        blockRefs.push([guid, runtimeBlock]);
      }
    }
    return blockRefs;
  }

  buildStyleRefs(blocks: Array<Block>, stylesUsed: Array<Style>): Array<StyleRef> {
    let styleRefs = new Array<[number, string]>();
    for (let style of stylesUsed) {
      styleRefs.push([blockIndex(blocks, style), style.asSource()]);
    }
    return styleRefs;
  }

  buildStaticStyles(sourceAnalysis: ElementSourceAnalysis, stylesUsed: Array<Style>): Array<number> {
    let staticStyles = new Array<number>();
    for (let style of sourceAnalysis.staticStyles) {
      staticStyles.push(styleIndex(stylesUsed, style));
    }
    return staticStyles;
  }

  buildTernaryStyles(sourceAnalysis: ElementSourceAnalysis, stylesUsed: Array<Style>, params: Array<AST.Expression>): Array<TernaryStyle> {
    let ternaryStyles = new Array<TernaryStyle>();
    for (let ternaryClass of sourceAnalysis.ternaryStyles) {
      if (isMustacheStatement(ternaryClass.condition!)) {
        params.push(this.mustacheToExpression(this.builders, ternaryClass.condition));
      } else {
        params.push(ternaryClass.condition!);
      }
      let c = params.length - 1;
      let t: Array<number>;
      if (isTrueCondition(ternaryClass)) {
        t = ternaryClass.whenTrue.map(cls => styleIndex(stylesUsed, cls));
      } else {
        t = [];
      }
      let f: Array<number>;
      if (isFalseCondition(ternaryClass)) {
        f = ternaryClass.whenFalse.map(cls => styleIndex(stylesUsed, cls));
      } else {
        f = [];
      }
      ternaryStyles.push([c, t, f]);
    }
    return ternaryStyles;
  }

  buildBooleanStyles(sourceAnalysis: ElementSourceAnalysis, stylesUsed: Array<Style>, params: Array<AST.Expression>): Array<BooleanStyle> {
    let booleanStyles = new Array<BooleanStyle>();
    for (let dynamicAttr of sourceAnalysis.booleanStyles) {
      if (isMustacheStatement(dynamicAttr.condition)) {
        params.push(this.mustacheToExpression(this.builders, dynamicAttr.condition));
      } else {
        params.push(dynamicAttr.condition);
      }
      let c = params.length - 1;
      let t = new Array<number>();
      for (let attr of dynamicAttr.value) {
        t.push(styleIndex(stylesUsed, attr));
      }
      booleanStyles.push([c, t]);
    }
    return booleanStyles;
  }

  buildSwitchStyles(sourceAnalysis: ElementSourceAnalysis, blocksUsed: Array<Block>, params: Array<AST.Expression>): Array<SwitchStyle> {
    let switchStyles = new Array<SwitchStyle>();
    for (let switchStyle of sourceAnalysis.switchStyles) {
      params.push(this.mustacheToStringExpression(this.builders, switchStyle.stringExpression!));
      let f: FalsySwitchBehavior;
      if (switchStyle.disallowFalsy) {
        f = FalsySwitchBehavior.error;
      } else {
        f = FalsySwitchBehavior.unset;
      }
      let values = Object.keys(switchStyle.group);
      // We have to find the attribute that belongs to the most specific sub-block.
      let attr: Attribute | undefined;
      for (let value of values) {
        let attrValue = switchStyle.group[value];
        if (!attr) {
          attr = attrValue.attribute;
        } else {
          if (attr.block.isAncestorOf(attrValue.block)) {
            attr = attrValue.attribute;
          }
        }
      }
      let b = blockIndex(blocksUsed, attr!);
      let a = attr!.asSource();
      let v = params.length - 1;
      switchStyles.push([v, f, b, a]);
    }
    return switchStyles;
  }

  mustacheToExpression(builders: Syntax["builders"], expr: AST.MustacheStatement): AST.Expression {
    if (isPathExpression(expr.path)) {
      if (expr.params.length === 0 && expr.hash.pairs.length === 0) {
        return expr.path;
      } else {
        return builders.sexpr(expr.path, expr.params, expr.hash);
      }
    } else if (isStringLiteral(expr.path)) {
      return expr.path;
    } else {
      return expr.path;
    }
  }

  mustacheToStringExpression(builders: Syntax["builders"], stringExpression: Exclude<StringAST, null>): AST.Expression {
    if (isConcatStatement(stringExpression)) {
      return builders.sexpr(
        builders.path(CONCAT_HELPER_NAME),
        stringExpression.parts.reduce(
          (arr, val) => {
            if (val.type === "TextNode") {
              arr.push(builders.string(val.chars));
            } else {
              arr.push(val.path);
            }
            return arr;
          },
          new Array<AST.Expression>()));
    } else if (isSubExpression(stringExpression)) {
      return stringExpression;
    } else if (isPathExpression(stringExpression)) {
      return builders.sexpr(stringExpression);
    } else if (isMustacheStatement(stringExpression)) {
      return this.mustacheToExpression(builders, stringExpression);
    } else {
      return assertNever(stringExpression);
    }
  }
}

function styleIndex(stylesUsed: Array<Style>, style: Style): number {
  let index = stylesUsed.indexOf(style);
  if (index >= 0) { return index; }
  stylesUsed.push(style);
  return stylesUsed.length - 1;
}

function blockIndex(blocks: Array<Block>, style: Style | Attribute) {
  for (let i = 0; i < blocks.length; i++) {
    if (style.block === blocks[i] || style.block.isAncestorOf(blocks[i])) {
      return i;
    } else if (blocks[i].isAncestorOf(style.block)) {
      blocks[i] = style.block;
      return i;
    }
  }
  blocks.push(style.block);
  return blocks.length - 1;
}
