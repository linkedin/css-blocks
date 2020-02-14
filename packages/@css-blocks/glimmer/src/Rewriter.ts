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
import { ElementAnalyzer, TemplateElement, isStyleOfHelper } from "./ElementAnalyzer";
import { getEmberBuiltInStates, isEmberBuiltIn, isEmberBuiltInNode } from "./EmberBuiltins";
import { CONCAT_HELPER_NAME } from "./helpers";
import { ResolvedFile, TEMPLATE_TYPE } from "./Template";
import { isTextNode } from "./utils";

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
        SubExpression: this.HelperStatement.bind(this),
        MustacheStatement: this.HelperStatement.bind(this),
        BlockStatement: this.HelperStatement.bind(this),
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

  HelperStatement(node: AST.MustacheStatement | AST.BlockStatement | AST.SubExpression) {
    if (isEmberBuiltInNode(node)) {
      this.BuiltInStatement(node);
    } else if (isStyleOfHelper(node)) {
      this.StyleOfHelper(node);
    }
  }

  BuiltInStatement(node: AST.MustacheStatement | AST.BlockStatement) {
    this.elementCount++;

    let name = node.path.original;
    if (!isEmberBuiltIn(name)) return;
    // Simple single space AST node to reuse.
    const space: AST.Literal = this.syntax.builders.string(" ");
    const attrToStateMap = getEmberBuiltInStates(name);
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
        dynamicValue = classnamesSubexpr(this.syntax.builders, rewrite, element);
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

  buildStringValue(subexpression: false, value: string): AST.TextNode;
  buildStringValue(subexpression: true, value: string): AST.StringLiteral;
  buildStringValue(subexpression: boolean, value: string): AST.StringLiteral | AST.TextNode;
  buildStringValue(subexpression: boolean, value: string): AST.StringLiteral | AST.TextNode {
    if (subexpression) {
      return this.syntax.builders.string(value);
    } else {
      return this.syntax.builders.text(value);
    }
  }

  buildStringConcatExpr(strings: Array<string | AST.SubExpression | AST.StringLiteral>): AST.SubExpression {
    return this.syntax.builders.sexpr(
      this.syntax.builders.path("-css-blocks-concat"),
      strings.map(s => {
        if (typeof s === "string") {
          return this.syntax.builders.string(s);
        } else {
          return s;
        }
      }),
    );
  }

  buildStringConcatStmnt(strings: Array<string | AST.MustacheStatement | AST.TextNode>): AST.ConcatStatement {
    return this.syntax.builders.concat(
      strings.map(s => {
        if (typeof s === "string") {
          return this.syntax.builders.text(s);
        } else {
          return s;
        }
      }),
    );
  }

  buildClassValue(subexpression: false, analysis: TemplateElement): AST.TextNode | AST.MustacheStatement | AST.ConcatStatement | null;
  buildClassValue(subexpression: true, analysis: TemplateElement): AST.StringLiteral | AST.SubExpression | null;
  buildClassValue(subexpression: boolean, analysis: TemplateElement): AST.StringLiteral | AST.SubExpression | AST.TextNode | AST.MustacheStatement | AST.ConcatStatement | null {
    let sExp: AST.StringLiteral | AST.SubExpression | null = null;
    let stmnt: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement | null = null;
    let rewrite = this.styleMapping.simpleRewriteMapping(analysis);
    this.debug(analysis.forOptimizer(this.cssBlocksOpts)[0].toString());

    // Set a static class AST node if needed.
    if (rewrite.staticClasses.length) {
      if (subexpression) {
        sExp = this.buildStringValue(true, rewrite.staticClasses.join(" "));
      } else {
        stmnt = this.buildStringValue(false, rewrite.staticClasses.join(" "));
      }
    }

    // Set a dynamic classes AST node if needed.
    if (rewrite.dynamicClasses.length) {
      if (subexpression) {
        let dynamicValue = classnamesSubexpr(this.syntax.builders, rewrite, analysis);
        if (sExp) {
          sExp = this.buildStringConcatExpr([sExp, " ", dynamicValue]);
        } else {
          sExp = dynamicValue;
        }
      } else {
        let dynamicValue = classnamesHelper(this.syntax.builders, rewrite, analysis);
        if (stmnt) {
          stmnt = this.buildStringConcatStmnt([stmnt, " ", dynamicValue]);
        } else {
          stmnt = dynamicValue;
        }
      }
    }

    return subexpression ? sExp : stmnt;
  }

  StyleOfHelper(node: AST.MustacheStatement | AST.SubExpression): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    let attrNames = Object.keys(attrMap);
    if (attrNames.length !== 1 || attrNames[0] !== "class") {
      console.error("Error: unexpected attributes in rewrite for style-of helper", attrNames);
    }
    node.path = this.syntax.builders.path("-css-blocks-concat");
    let attrValue = this.buildClassValue(true, attrMap["class"]);
    if (attrValue) {
      node.params = [attrValue];
    } else {
      node.params = [];
    }
    node.hash.pairs = [];
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
