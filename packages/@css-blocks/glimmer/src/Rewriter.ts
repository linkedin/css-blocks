import {
  Block,
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  resolveConfiguration,
} from "@css-blocks/core";
import { DEFAULT_EXPORT } from "@css-blocks/core/dist/src/BlockSyntax";
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

const DEBUG = debugGenerator("css-blocks:glimmer:rewriter");

export type GlimmerStyleMapping = StyleMapping<TEMPLATE_TYPE>;

interface ASTPluginWithDeps extends ASTPlugin {
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
  dependencies(relativePath: string): string[];
}

export class GlimmerRewriter implements ASTPluginWithDeps {
  template: ResolvedFile;
  analysis: GlimmerAnalysis;
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: GlimmerStyleMapping;
  cssBlocksOpts: CSSBlocksConfiguration;
  visitor: NodeVisitor;
  visitors: NodeVisitor;

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
    this.block         = analysis.getBlock(DEFAULT_EXPORT)!; // Local block check done elsewhere
    this.styleMapping  = styleMapping;
    this.cssBlocksOpts = resolveConfiguration(cssBlocksOpts);
    this.elementCount  = 0;
    this.elementAnalyzer = new ElementAnalyzer(this.analysis, this.cssBlocksOpts);
    if (this.block) {
      this.visitor = {
        ElementNode: this.ElementNode.bind(this),
        MustacheStatement: this.BuiltinStatement.bind(this),
        BlockStatement: this.BuiltinStatement.bind(this),
      };
    } else {
      this.visitor = {};
    }
    this.visitors = this.visitor;
  }

  debug(message: string, ...args: unknown[]): void {
    DEBUG(`${this.template.path}: ${message}`, ...args);
  }

  get name(): string { return this.block ? "css-blocks-glimmer-rewriter" : "css-blocks-noop"; }

  /**
   * @param _relativePath Unused in this implementation.
   * @returns Files this template file depends on.
   */
  dependencies(_relativePath: string): Array<string> {
    this.debug("Getting dependencies for", _relativePath);
    let deps: Set<string> = new Set();

    // let importer = this.cssBlocksOpts.importer;
    for (let block of this.analysis.transitiveBlockDependencies()) {
      // TODO: Figure out why the importer is returning null here.
      // let blockFile = importer.filesystemPath(block.identifier, this.cssBlocksOpts);
      let blockFile = block.identifier;
      this.debug("block file path is", blockFile);
      if (blockFile) {
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
    node.hash.pairs = node.hash.pairs.filter(a => this.elementAnalyzer.isAttributeAnalyzed(a.key)[0] === null).filter(a => !attrToStateMap[a.key]);

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
    node.attributes = node.attributes.filter(a => this.elementAnalyzer.isAttributeAnalyzed(a.name)[0] === null);

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
