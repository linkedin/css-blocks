import {
  Block,
  Configuration as CSSBlocksConfiguration,
  Style,
  isFalseCondition,
  isTrueCondition,
} from "@css-blocks/core";
import {
  ElementAnalyzer,
} from "@css-blocks/glimmer";
// TODO: Remove these runtime dependencies on @css-blocks/glimmer
import { StringExpression as StringAST, TemplateElement, isStyleOfHelper } from "@css-blocks/glimmer/dist/cjs/src/ElementAnalyzer";
import { getEmberBuiltInStates, isEmberBuiltIn, isEmberBuiltInNode } from "@css-blocks/glimmer/dist/cjs/src/EmberBuiltins";
import { CONCAT_HELPER_NAME } from "@css-blocks/glimmer/dist/cjs/src/helpers";
import { cssBlockError, isConcatStatement, isMustacheStatement, isPathExpression, isStringLiteral, isSubExpression, isTextNode, pathString } from "@css-blocks/glimmer/dist/cjs/src/utils";
import {
  AST,
  ASTPlugin,
  NodeVisitor,
  Syntax,
} from "@glimmer/syntax";
import { assertNever } from "@opticss/util";
import * as debugGenerator from "debug";

import { EmberAnalysis } from "./EmberAnalysis";
import { HandlebarsTemplate, TEMPLATE_TYPE } from "./HandlebarsTemplate";

const CLASSNAMES_HELPER = "-cssblocks-";
const HELPER_VERSION = 0;

const enum StyleCondition {
  STATIC = 1,
  BOOLEAN = 2,
  TERNARY = 3,
  SWITCH = 4,
}

const enum FalsySwitchBehavior {
  error,
  unset,
  default,
}

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
    if (block) {
      block.eachBlockExport(analysis.addBlock.bind(analysis));
    }
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
    const attrToStateMap = getEmberBuiltInStates(name);
    let atRootElement = (this.elementCount === 1);

    const attrMap = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);

    // Remove all the source attributes for styles.
    node.hash.pairs = node.hash.pairs.filter(a => this.elementAnalyzer.isAttributeAnalyzed(a.key)[0] === null).filter(a => !attrToStateMap[a.key]);

    for (let attr of Object.keys(attrMap)) {
      if (attr === "class") {
        let element = attrMap[attr];
        this.debug(element.forOptimizer(this.cssBlocksOpts)[0].toString());
        let attrValue = this.buildClassValue(true, element);
        let hash = this.syntax.builders.pair(attr, attrValue!);
        node.hash.pairs.push(hash);
      }
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

  buildClassValue(subExpression: false, analysis: TemplateElement, node?: AST.MustacheStatement): AST.MustacheStatement | AST.ConcatStatement | null;
  buildClassValue(subExpression: true, analysis: TemplateElement, node?: AST.SubExpression): AST.SubExpression | null;
  buildClassValue(subExpression: boolean, analysis: TemplateElement, node?: AST.SubExpression | AST.MustacheStatement): AST.SubExpression | AST.MustacheStatement | AST.ConcatStatement | null {
    const { sexpr, path, mustache, number: num, string: str, null: nullNode } = this.syntax.builders;
    let sourceAnalysis = analysis.getSourceAnalysis();
    if (sourceAnalysis.size() === 0) {
      return node || null;
    }
    if (subExpression) {
      if (node && !isSubExpression(node)) {
        throw new Error(`Illegal node ${node.type}`);
      } else if (!node) {
        node = sexpr(path(CLASSNAMES_HELPER));
      } else {
        node.path = path(CLASSNAMES_HELPER);
      }
    } else {
      if (node && isSubExpression(node)) {
        throw new Error(`Illegal node ${node.type}`);
      } else if (!node) {
        node = mustache(path(CLASSNAMES_HELPER));
      } else {
        node.path = path(CLASSNAMES_HELPER);
      }
    }
    node.params.push(num(HELPER_VERSION));
    let blocks = [...sourceAnalysis.blocksFound];
    node.params.push(num(blocks.length));
    for (let block of blocks) {
      node.params.push(str(block.guid));
      node.params.push(nullNode()); // this could be a block when we implement block passing
    }
    let styles = [...sourceAnalysis.stylesFound];
    node.params.push(num(styles.length));
    let styleIndices = new Map<Style, number>();
    let i = 0;
    for (let style of styles) {
      styleIndices.set(style, i++);
      node.params.push(num(indexOfBlock(blocks, style)));
      node.params.push(num(style.index));
    }
    node.params.push(num(sourceAnalysis.size()));

    for (let style of sourceAnalysis.staticStyles) {
      node.params.push(num(StyleCondition.STATIC));
      node.params.push(num(styleIndices.get(style)!));
    }

    for (let ternaryClass of sourceAnalysis.ternaryStyles) {
      node.params.push(num(StyleCondition.TERNARY));
      if (isMustacheStatement(ternaryClass.condition!)) {
        node.params.push(mustacheToExpression(this.syntax.builders, ternaryClass.condition));
      } else {
        node.params.push(ternaryClass.condition!);
      }
      if (isTrueCondition(ternaryClass)) {
        node.params.push(num(ternaryClass.whenTrue.length));
        for (let cls of ternaryClass.whenTrue) {
          node.params.push(num(styleIndices.get(cls)!));
        }
      } else {
        // there are no classes applied if true
        node.params.push(num(0));
      }
      if (isFalseCondition(ternaryClass)) {
        node.params.push(num(ternaryClass.whenFalse.length));
        for (let cls of ternaryClass.whenFalse) {
          node.params.push(num(styleIndices.get(cls)!));
        }
      } else {
        // there are no classes applied if false
        node.params.push(num(0));
      }
    }

    for (let dynamicAttr of sourceAnalysis.booleanStyles) {
      node.params.push(num(StyleCondition.BOOLEAN));
      if (isMustacheStatement(dynamicAttr.condition)) {
        node.params.push(mustacheToExpression(this.syntax.builders, dynamicAttr.condition));
      } else {
        node.params.push(dynamicAttr.condition);
      }
      node.params.push(num(dynamicAttr.value.size));
      for (let attr of dynamicAttr.value) {
        node.params.push(num(styleIndices.get(attr)!));
      }
    }

    for (let switchStyle of sourceAnalysis.switchStyles) {
      let values = Object.keys(switchStyle.group);
      node.params.push(num(StyleCondition.SWITCH));
      if (switchStyle.disallowFalsy) {
        node.params.push(num(FalsySwitchBehavior.error));
      } else {
        node.params.push(num(FalsySwitchBehavior.unset));
      }
      node.params.push(mustacheToStringExpression(this.syntax.builders, switchStyle.stringExpression!));
      for (let value of values) {
        let obj = switchStyle.group[value];
        node.params.push(str(value));
        // If there are values provided for this conditional, they are meant to be
        // applied instead of the selected attribute group member.
        if (switchStyle.value.size) {
          node.params.push(num(switchStyle.value.size));
          for (let val of switchStyle.value) {
            node.params.push(num(styleIndices.get(val)!));
          }
        }
        else {
          node.params.push(num(1));
          node.params.push(num(styleIndices.get(obj)!));
        }
      }
    }
    return node;
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
    node.params = [];
    node.hash.pairs = [];
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

function mustacheToExpression(builders: Syntax["builders"], expr: AST.MustacheStatement): AST.Expression {
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

function mustacheToStringExpression(builders: Syntax["builders"], stringExpression: Exclude<StringAST, null>): AST.Expression {
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
    return mustacheToExpression(builders, stringExpression);
  } else {
    return assertNever(stringExpression);
  }
}

function indexOfBlock(blocks: Array<Block>, style: Style) {
  for (let i = 0; i < blocks.length; i++) {
    if (style.block === blocks[i] || style.block.isAncestorOf(blocks[i])) {
      return i;
    }
  }
  throw new Error("[internal error] Block not found.");
}
