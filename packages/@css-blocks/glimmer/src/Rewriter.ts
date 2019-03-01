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
import { whatever } from "@opticss/util";
import * as debugGenerator from "debug";

import { GlimmerAnalysis } from "./Analyzer";
import { classnamesHelper, classnamesSubexpr } from "./ClassnamesHelperGenerator";
import { ElementAnalyzer } from "./ElementAnalyzer";
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

  debug(message: string, ...args: whatever[]): void {
    DEBUG(`${this.template.path}: ${message}`, ...args);
  }

  get name(): string { return this.block ? "css-blocks-glimmer-rewriter" : "css-blocks-noop"; }

  // `visitors` is used by Ember < 3.0.0. `visitor` is used by Glimmer and Ember >= 3.0.0.
  get visitor(): NodeVisitor { return this.visitors; }
  get visitors(): NodeVisitor {
    if (!this.block) { return {}; }
    return {
      ElementNode: this.ElementNode.bind(this),
      MustacheStatement: this.LinkToStatement.bind(this),
      BlockStatement: this.LinkToStatement.bind(this),
    };
  }

  LinkToStatement(node: AST.MustacheStatement | AST.BlockStatement) {
    if (node.path.original !== "link-to") { return; }
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    // TODO: We use this to re-analyze elements in the rewriter.
    //       We've already done this work and should be able to
    //       re-use the data! Unfortunately, there are problems...
    //       See: https://github.com/linkedin/css-blocks/issues/84
    let element = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    let rewrite = this.styleMapping.simpleRewriteMapping(element);
    this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());

    // Remove all the source attributes for styles.
    node.hash.pairs = node.hash.pairs.filter(a => !STYLE_ATTR.test(a.key)).filter(a => a.key !== "activeClass");

    // It's a simple text node of static classes.
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
    const classValue = (staticValue && dynamicValue) ? this.syntax.builders.sexpr(this.syntax.builders.path(CONCAT_HELPER_NAME), [staticValue, dynamicValue]) : (staticValue || dynamicValue);

    // Add the new class attribute.
    let hash = this.syntax.builders.pair("class", classValue!);
    node.hash.pairs.push(hash);

    // For every class on the element...
    let strings: string[] = [];
    for (let klass of element.classesFound()) {
      // Check to see if it has an active class,
      let activeClass = klass.resolveAttribute("[state|active]");
      if (activeClass && activeClass.presenceRule) {
        // If yes, get the re-written class name and preserve it in AST form.
        let rewritten = this.styleMapping.optimizedMap.getRewriteOf({
          name: "class",
          value: activeClass.presenceRule.cssClasses(this.cssBlocksOpts).join(" "),
        });
        if (!rewritten) { continue; }
        strings.push(rewritten.value);
      }
    }

    // If there are active classes, pass them to the helper.
    if (strings.length) {
      let activeHash = this.syntax.builders.pair("activeClass", this.syntax.builders.string(strings.join(" ")));
      node.hash.pairs.push(activeHash);
    }
  }

  ElementNode(node: AST.ElementNode): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    // TODO: We use this to re-analyze elements in the rewriter.
    //       We've already done this work and should be able to
    //       re-use the data! Unfortunately, there are problems...
    //       See: https://github.com/linkedin/css-blocks/issues/84
    let element = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
    let rewrite = this.styleMapping.simpleRewriteMapping(element);

    // Remove all the source attributes for styles.
    node.attributes = node.attributes.filter(a => !STYLE_ATTR.test(a.name));

    // It's a simple text node of static classes.
    let staticValue: AST.TextNode | null = null;
    let dynamicValue: AST.MustacheStatement | null = null;

    if (rewrite.staticClasses.length) {
      staticValue = this.syntax.builders.text(rewrite.staticClasses.join(" "));
    }

    if (rewrite.dynamicClasses.length) {
      dynamicValue = classnamesHelper(rewrite, element);
    }

    if (!staticValue && !dynamicValue) { return; }

    const classValue = (staticValue && dynamicValue) ? this.syntax.builders.concat([staticValue, dynamicValue]) : (staticValue || dynamicValue);

    node.attributes.unshift(this.syntax.builders.attr("class", classValue!));

  }
}
