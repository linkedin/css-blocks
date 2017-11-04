import * as debugGenerator from 'debug';
import {
  AST,
  Syntax,
  NodeVisitor
} from '@glimmer/syntax';
import {
  Block,
  PluginOptionsReader as CssBlocksOptionsReader,
  PluginOptions as CssBlocksOpts,
  StyleMapping,
  TemplateAnalysis,
} from "css-blocks";

import { ResolvedFile } from "./GlimmerProject";
import { ElementAnalyzer } from "./ElementAnalyzer";
import { classnamesHelper } from "./ClassnamesHelperGenerator";

const DEBUG = debugGenerator("css-blocks:glimmer");

const STYLE_ATTR = /^(class$|state:)/;

export class Rewriter implements NodeVisitor {
  template: ResolvedFile;
  analysis: TemplateAnalysis<"GlimmerTemplates.ResolvedFile">;
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: StyleMapping;
  cssBlocksOpts: CssBlocksOptionsReader;

  private elementAnalyzer: ElementAnalyzer;

  constructor(syntax: Syntax, styleMapping: StyleMapping, analysis: TemplateAnalysis<"GlimmerTemplates.ResolvedFile">, cssBlocksOpts: CssBlocksOpts) {
    this.syntax        = syntax;
    this.analysis      = analysis;
    this.template      = <ResolvedFile>analysis.template;
    this.block         = analysis.blocks[""];
    this.styleMapping  = styleMapping;
    this.cssBlocksOpts = new CssBlocksOptionsReader(cssBlocksOpts);
    this.elementCount  = 0;
    this.elementAnalyzer = new ElementAnalyzer(this.block, this.template, this.cssBlocksOpts);
  }

  debug(message: string, ...args: any[]): void {
    DEBUG(`${this.template.fullPath}: ${message}`, ...args);
  }

  ElementNode(node: AST.ElementNode) {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let element = this.elementAnalyzer.analyzeForRewrite(node, atRootElement);
    let rewrite = this.styleMapping.simpleRewriteMapping(element);

    // Remove all the source attributes for styles.
    node.attributes = node.attributes.filter(a => !STYLE_ATTR.test(a.name));

    if (rewrite.dynamicClasses.length === 0) {
      if (rewrite.staticClasses.length === 0) {
        // there's no styles. we're done.
        return;
      }

      // It's a simple text node of static classes.
      let value = this.syntax.builders.text(rewrite.staticClasses.join(' '));
      let classAttr = this.syntax.builders.attr("class", value);
      node.attributes.unshift(classAttr);
      return;
    }

    let dynamicNode = classnamesHelper(rewrite, element);
    let classValue: AST.MustacheStatement | AST.ConcatStatement;
    let staticNode: AST.TextNode | undefined = undefined;
    if (rewrite.staticClasses.length > 0) {
      staticNode = this.syntax.builders.text(rewrite.staticClasses.join(' ') + ' ');
      classValue = this.syntax.builders.concat([staticNode, dynamicNode]);
    } else {
      classValue = dynamicNode;
    }

    node.attributes.unshift(this.syntax.builders.attr("class", classValue));

    return;
  }

/*

    if (rewrite.dynamicClasses.size === 0) {
      if (rewrite.staticClasses.length === 0) {
        // There's no class? nuke the attr and go home.
        if (classAttr) {
          node.attributes = node.attributes.filter(a => a !== classAttr);
        }
        return;
      }
      if (classAttr) {

      } else {
        classAttr = this.syntax.builders.attr("class", concatStatement);
        node.attributes.push(classAttr);
        return this.syntax.builders.attr("class", concatStatement)
      }
    }

    // Get our new class...classes
    let classSet = new Set<BlockObject>([...classObjects]);
    let staticClassNames: string[] | undefined;
    if (DEBUG.enabled) {
      staticClassNames = classObjects.map(o => `${o.block.name}${o.asSource()}`);
    }
    let newClassValue: string = this.styleMapping.mapObjects(...classSet).join(' ');
    if (DEBUG.enabled && staticClassNames) {
      this.debug(`Rewriting static classes "${staticClassNames.join(' ')}" to "${newClassValue}"`);
    }

    // Get our new state classes expression
    statesMap.forEach((states: State[], value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement) => {
      states.forEach((state: State) => {
        let newClass = this.styleMapping.blockMappings.get(state);

        if ( !newClass ) { return; }
        let classStr = ' ' + newClass.join(' ');

        // If value is a string, we can just add the class to our new class list.
        if ( value.type === 'TextNode' ) {
          this.debug(`Rewriting static state "${state.block.name}.${state.asSource()}" to "${newClass.join(' ')}"`);
          parts.push(this.syntax.builders.text(classStr));
        }

        // Otherise, this state value is dynamic, we need to have some fun. We
        // need to force it into the right type, then output it into our {{style-if}}
        // helper.
        else {
          let condition: AST.SubExpression | AST.Literal | AST.PathExpression | undefined;

          if ( value.type === 'MustacheStatement' ) {
            condition = value.path;
          }

          // If this is a concat statement, we need to emit a concat subexpression
          // helper instead.
          else if ( value.type === 'ConcatStatement' ) {
            condition = this.syntax.builders.sexpr (
              this.syntax.builders.path('/css-blocks/components/concat'),
              value.parts.reduce( (arr, val): AST.Expression[] => {
                arr.push( (val.type === 'TextNode') ? this.syntax.builders.string(val.chars) : val.path);
                return arr;
              }, ([] as AST.Expression[]))
            );
          }

          // If we couldn't create a well formed condition statement, move on.
          if ( !condition ) {
            throw Error(`Unsupported Mustache expression for state: ${value.type}`);
          }

          // Constructo our helper and add to class list.
          let helper: AST.MustacheStatement;
          if ( states.length > 1 ) {
            this.debug(`Rewriting dynamic state "${state.block.name}.${state.asSource()}" to "${classStr}"`);
            helper = this.syntax.builders.mustache('/css-blocks/components/state', [
              condition,
              this.syntax.builders.string(state.name),
              this.syntax.builders.string(classStr)
            ]);
          }
          else {
            this.debug(`Rewriting dynamic state "${state.block.name}.${state.asSource()}" to "${classStr}"`);
            helper = this.syntax.builders.mustache('/css-blocks/components/state', [
              condition,
              this.syntax.builders.string(classStr)
            ]);
          }
          parts.push(helper);
        }
      });
    });

    // let concatStatement = this.syntax.builders.concat(parts);

    if (!classAttr) {
      classAttr = this.syntax.builders.attr("class", concatStatement);
      node.attributes.push(classAttr);
    } else {
      classAttr.value = concatStatement;
    }
  }
  */
}
