import {
  Block,
  Configuration as CSSBlocksConfiguration,
} from "@css-blocks/core";
import {
  ElementAnalyzer,
} from "@css-blocks/glimmer";
import { TemplateElement, isStyleOfHelper } from "@css-blocks/glimmer/dist/cjs/src/ElementAnalyzer";
import { getEmberBuiltInStates, isEmberBuiltIn, isEmberBuiltInNode } from "@css-blocks/glimmer/dist/cjs/src/EmberBuiltins";
import { cssBlockError, isTextNode, pathString } from "@css-blocks/glimmer/dist/cjs/src/utils";
import {
  AST,
  ASTPlugin,
  NodeVisitor,
  Syntax,
} from "@glimmer/syntax";
import * as debugGenerator from "debug";

import { EmberAnalysis } from "./EmberAnalysis";
import { HandlebarsTemplate, TEMPLATE_TYPE } from "./HandlebarsTemplate";

const NOOP_VISITOR = {};
const DEBUG = debugGenerator("css-blocks:glimmer:analyzing-rewriter");

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

export class TemplateAnalyzingRewriter implements ASTPluginWithDeps {
  visitor: NodeVisitor;
  visitors: NodeVisitor;
  elementCount: number;
  template: HandlebarsTemplate;
  block: Block | null | undefined;
  syntax: Syntax;
  elementAnalyzer: ElementAnalyzer<TEMPLATE_TYPE>;
  cssBlocksOpts: CSSBlocksConfiguration;

  constructor(template: HandlebarsTemplate, block: Block | undefined | null, analysis: EmberAnalysis, options: CSSBlocksConfiguration, syntax: Syntax) {
    this.elementCount = 0;
    this.template = template;
    this.block = block;
    this.syntax = syntax;
    this.elementAnalyzer = new ElementAnalyzer(analysis, options);
    this.cssBlocksOpts = options;
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
  }
  debug(message: string, ...args: unknown[]): void {
    DEBUG(`${this.template}: ${message}`, ...args);
  }

  get name(): string { return this.block ? "css-blocks-glimmer-rewriter" : "css-blocks-noop"; }

  /**
   * @param _relativePath Unused in this implementation.
   * @returns Files this template file depends on.
   */
  dependencies(_relativePath: string): Array<string> {
    this.debug("Getting dependencies for", _relativePath);
    if (!this.block) return [];

    let deps: Set<string> = new Set();
    // let importer = this.cssBlocksOpts.importer;
    for (let block of this.block.transitiveBlockDependencies()) {
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

    let name = pathString(node);
    if (!isEmberBuiltIn(name)) return;
    // Simple single space AST node to reuse.
    // const space: AST.Literal = this.syntax.builders.string(" ");
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
      this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
      // TODO
    }
  }

  buildStringValue(subExpression: false, value: string): AST.TextNode;
  buildStringValue(subExpression: true, value: string): AST.StringLiteral;
  buildStringValue(subExpression: boolean, value: string): AST.StringLiteral | AST.TextNode;
  buildStringValue(subExpression: boolean, value: string): AST.StringLiteral | AST.TextNode {
    if (subExpression) {
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

  buildClassValue(subExpression: false, analysis: TemplateElement): AST.TextNode | AST.MustacheStatement | AST.ConcatStatement | null;
  buildClassValue(subExpression: true, analysis: TemplateElement): AST.StringLiteral | AST.SubExpression | null;
  buildClassValue(_subExpression: boolean, _analysis: TemplateElement): AST.StringLiteral | AST.SubExpression | AST.TextNode | AST.MustacheStatement | AST.ConcatStatement | null {
    return this.syntax.builders.string("TODO");
  }

  StyleOfHelper(node: AST.MustacheStatement | AST.SubExpression): void {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    let attrNames = Object.keys(attrMap);
    if (attrNames.length !== 1 || attrNames[0] !== "class") {
      const names = attrNames.filter(name => name !== "class");
      throw cssBlockError(`Unexpected attribute(s) [${names.join(", ")}] in rewrite for style-of helper.`, node, this.template.relativePath);
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
