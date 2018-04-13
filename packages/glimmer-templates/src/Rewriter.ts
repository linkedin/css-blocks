import {
  AST,
  ASTPlugin,
  NodeVisitor,
  Syntax,
} from "@glimmer/syntax";
import { whatever } from "@opticss/util";
import {
  Block,
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  resolveConfiguration,
} from "css-blocks";
import * as debugGenerator from "debug";

import { GlimmerAnalysis, TEMPLATE_TYPE } from "./Analyzer";
import { classnamesHelper } from "./ClassnamesHelperGenerator";
import { ElementAnalyzer } from "./ElementAnalyzer";
import { ResolvedFile } from "./GlimmerProject";
const DEBUG = debugGenerator("css-blocks:glimmer");

// TODO: The state namespace should come from a config option.
const STYLE_ATTR = /^(class$|state:)/;
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
    DEBUG(`${this.template.fullPath}: ${message}`, ...args);
  }

  get name(): string { return "CSSBlocksGlimmerRewriter"; }
  get visitor(): NodeVisitor {
    return {
      ElementNode: this.ElementNode.bind(this),
    };
  }

  ElementNode(node: AST.ElementNode) {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    // TODO: We use this to re-analyze elements in the rewriter.
    //       We've already done this work and should be able to
    //       re-use the data! Unfortunately, there are problems...
    //       See: https://github.com/css-blocks/css-blocks/issues/84
    let element = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
    let rewrite = this.styleMapping.simpleRewriteMapping(element);

    // Remove all the source attributes for styles.
    node.attributes = node.attributes.filter(a => !STYLE_ATTR.test(a.name));

    if (rewrite.dynamicClasses.length === 0) {
      if (rewrite.staticClasses.length === 0) {
        // there's no styles. we're done.
        return;
      }

      // It's a simple text node of static classes.
      let value = this.syntax.builders.text(rewrite.staticClasses.join(" "));
      let classAttr = this.syntax.builders.attr("class", value);
      node.attributes.unshift(classAttr);
      return;
    }

    let dynamicNode = classnamesHelper(rewrite, element);
    let classValue: AST.MustacheStatement | AST.ConcatStatement;
    let staticNode: AST.TextNode | undefined = undefined;
    if (rewrite.staticClasses.length > 0) {
      staticNode = this.syntax.builders.text(rewrite.staticClasses.join(" ") + " ");
      classValue = this.syntax.builders.concat([staticNode, dynamicNode]);
    } else {
      classValue = dynamicNode;
    }

    node.attributes.unshift(this.syntax.builders.attr("class", classValue));

    return;
  }
}
