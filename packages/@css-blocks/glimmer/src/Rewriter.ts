import {
  Block,
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  resolveConfiguration,
} from "@css-blocks/core";
import {
  AST,
  ASTPlugin,
  NodeVisitor,
  Syntax,
} from "@glimmer/syntax";
import * as debugGenerator from "debug";

import { GlimmerAnalysis } from "./Analyzer";
import { classnamesHelper, classnamesSubexpr } from "./ClassnamesHelperGenerator";
import { ElementAnalyzer } from "./ElementAnalyzer";
import { getEmberBuiltInStates, isEmberBuiltIn } from "./EmberBuiltins";
import { CONCAT_HELPER_NAME } from "./helpers";
import { ResolvedFile, TEMPLATE_TYPE } from "./Template";

// TODO: The state namespace should come from a config option.
const STYLE_ATTR = /^(class$|state:)/;
const DEBUG = debugGenerator("css-blocks:glimmer:rewriter");

export type GlimmerStyleMapping = StyleMapping<TEMPLATE_TYPE>;

export class GlimmerRewriter implements ASTPlugin {
  template: ResolvedFile;
  analysis: GlimmerAnalysis;
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: GlimmerStyleMapping;
  cssBlocksOpts: CSSBlocksConfiguration;

  private elementAnalyzer: ElementAnalyzer;

  constructor(
    syntax: Syntax,
    styleMapping: GlimmerStyleMapping,
    analysis: GlimmerAnalysis,
    cssBlocksOpts: CSSBlocksOptions,
  ) {
    this.syntax        = syntax;
    this.analysis      = analysis;
    this.template      = analysis.template;
    this.block         = analysis.getBlock("")!; // Local block check done elsewhere
    this.styleMapping  = styleMapping;
    this.cssBlocksOpts = resolveConfiguration(cssBlocksOpts);
    this.elementCount  = 0;
    this.elementAnalyzer = new ElementAnalyzer(this.analysis, this.cssBlocksOpts);
  }

  debug(message: string, ...args: unknown[]): void {
    DEBUG(`${this.template.path}: ${message}`, ...args);
  }

  get name(): string { return this.block ? "css-blocks-glimmer-rewriter" : "css-blocks-noop"; }

  // `visitors` is used by Ember < 3.0.0. `visitor` is used by Glimmer and Ember >= 3.0.0.
  get visitor(): NodeVisitor { return this.visitors; }
  get visitors(): NodeVisitor {
    if (!this.block) { return {}; }
    return {
      ElementNode: this.ElementNode.bind(this),
      MustacheStatement: this.BuiltinStatement.bind(this),
      BlockStatement: this.BuiltinStatement.bind(this),
    };
  }

  BuiltinStatement(node: AST.MustacheStatement | AST.BlockStatement) {
    if (!isEmberBuiltIn(node.path.original)) { return; }
    this.elementCount++;

    // Simple single space AST node to reuse.
    const space: AST.Literal = this.syntax.builders.string(" ");
    const attrToStateMap = getEmberBuiltInStates(node.path.original);
    let atRootElement = (this.elementCount === 1);

    // TODO: We use this to re-analyze elements in the rewriter.
    //       We've already done this work and should be able to
    //       re-use the data! Unfortunately, there are problems...
    //       See: https://github.com/linkedin/css-blocks/issues/84
    const attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);

    // Remove all the source attributes for styles.
    node.hash.pairs = node.hash.pairs.filter(a => !STYLE_ATTR.test(a.key)).filter(a => !attrToStateMap[a.key]);

    for (let attr of Object.keys(attrMap)) {
      let element = attrMap[attr];
      let rewrite = this.styleMapping.simpleRewriteMapping(element);
      this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
      let staticValue: AST.Literal | null = null;
      let dynamicValue: AST.Expression | null = null;

      // Set a static class AST node if needed.
      if (rewrite.staticClasses.length) {
        staticValue = this.syntax.builders.string(rewrite.staticClasses.join(" "));
      }

      // Set a dynamic classes AST node if needed.
      if (rewrite.dynamicClasses.length) {
        dynamicValue = classnamesSubexpr(rewrite, element);
      }

      // If no classes, return.
      if (!staticValue && !dynamicValue) { return; }

      // If both static and dynamic, concat them together, otherwise use one or the other.
      const attrValue = (staticValue && dynamicValue) ? this.syntax.builders.sexpr(this.syntax.builders.path(CONCAT_HELPER_NAME), [staticValue, space, dynamicValue]) : (staticValue || dynamicValue);

      // Add the new attribute.
      let hash = this.syntax.builders.pair(attr, attrValue!);
      node.hash.pairs.push(hash);
    }
  }

  ElementNode(node: AST.ElementNode): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    const space: AST.TextNode = this.syntax.builders.text(" ");
    let attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);

    // Remove all the source attributes for styles.
    node.attributes = node.attributes.filter(a => !STYLE_ATTR.test(a.name));

    for (let attr of Object.keys(attrMap)) {
      let element = attrMap[attr];
      let rewrite = this.styleMapping.simpleRewriteMapping(element);
      this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
      let staticValue: AST.TextNode | null = null;
      let dynamicValue: AST.MustacheStatement | null = null;

      // Set a static class AST node if needed.
      if (rewrite.staticClasses.length) {
        staticValue = this.syntax.builders.text(rewrite.staticClasses.join(" "));
      }

      // Set a dynamic classes AST node if needed.
      if (rewrite.dynamicClasses.length) {
        dynamicValue = classnamesHelper(rewrite, element);
      }

      // If no classes, return.
      if (!staticValue && !dynamicValue) { return; }

      // If both static and dynamic, concat them together, otherwise use one or the other.
      const attrValue = (staticValue && dynamicValue) ? this.syntax.builders.concat([staticValue, space, dynamicValue]) : (staticValue || dynamicValue);

      // Add the new attribute.
      let hash = this.syntax.builders.attr(attr, attrValue!);
      node.attributes.push(hash);
    }
  }
}
