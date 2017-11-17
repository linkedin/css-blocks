import { isConsoleLogStatement } from '../utils/isConsoleLogStatement';
import { JSXElementAnalyzer } from '../analyzer/JSXElementAnalyzer';
import { StyleMapping, PluginOptionsReader } from 'css-blocks';
import { NodePath } from 'babel-traverse';
import Rewriter from './index';
import Analysis, { } from '../utils/Analysis';
import { PluginObj } from 'babel-core';
import {
  identifier,
  stringLiteral,
  importDeclaration,
  importSpecifier,
  jSXAttribute,
  jSXExpressionContainer,
  jSXIdentifier,
  ImportDeclaration,
  JSXOpeningElement,
  Statement,
  isJSXExpressionContainer,
} from 'babel-types';

import isBlockFilename from '../utils/isBlockFilename';
import { classnamesHelper as generateClassName} from './classNameGenerator';
let { parse } = require('path');

export interface CssBlocksVisitor {
  importsToRemove: Array<NodePath<ImportDeclaration>>;
  statementsToRemove: Array<NodePath<Statement>>;
  elementAnalyzer: JSXElementAnalyzer;
  filename: string;
  mapping: StyleMapping;
  analysis: Analysis;
  cssBlockOptions: PluginOptionsReader;
  shouldProcess: boolean;
}

const CAN_PARSE_EXTENSIONS = {
  '.tsx': true,
  '.jsx': true,
};

export default function mkTransform(tranformOpts: { rewriter: Rewriter }): () => PluginObj<CssBlocksVisitor> {
  const rewriter = tranformOpts.rewriter;

  return function transform(): PluginObj<CssBlocksVisitor> {

    return {
      pre(file: any) {
        this.importsToRemove = new Array<NodePath<ImportDeclaration>>();
        this.statementsToRemove = new Array<NodePath<Statement>>();
        this.filename = file.opts.filename;
        this.mapping = rewriter.blocks[this.filename];
        if (this.mapping && this.mapping.analyses) {
          let a = this.mapping.analyses.find(a => a.template.identifier === this.filename);
          if (a instanceof Analysis) this.analysis = a;
        } else {
          this.shouldProcess = false;
        }
        let ext = parse(this.filename).ext;
        this.shouldProcess = CAN_PARSE_EXTENSIONS[ext] && this.analysis && this.analysis.blockCount() > 0;
        if (this.shouldProcess) {
          this.elementAnalyzer = new JSXElementAnalyzer(this.analysis.blocks, this.filename);
        }
      },
      post(state: any) {
        let firstImport = this.importsToRemove.shift()!;
        firstImport.replaceWith(importDeclaration([importSpecifier(identifier('cla$$'), identifier('classNameHelper'))], stringLiteral('@css-blocks/jsx')));
        for (let nodePath of this.importsToRemove) {
          nodePath.remove();
        }
        for (let nodePath of this.statementsToRemove) {
          nodePath.remove();
        }
      },
      visitor: {

        // If this is a CSS Blocks import, always remove it.
        ImportDeclaration(nodePath: NodePath<ImportDeclaration>) {
          // We always remove block imports even if we're aborting the processing -- they can only cause problems.
          if (isBlockFilename(nodePath.node.source.value)) {
            this.importsToRemove.push(nodePath);
          }
        },

        JSXOpeningElement(path: NodePath<JSXOpeningElement>, state: any): void {
          if (!this.shouldProcess) return;

          let elementAnalysis = this.elementAnalyzer.analyze(this.filename, path);
          if (elementAnalysis) {
            let classMapping = this.mapping.simpleRewriteMapping(elementAnalysis);
            let newClassAttr = jSXAttribute(jSXIdentifier('class'), jSXExpressionContainer(generateClassName(classMapping, elementAnalysis, true)));

            let classAttrs = this.elementAnalyzer.classAttributePaths(path);
            for (let attrPath of classAttrs) {
              let binding = this.elementAnalyzer.styleVariableBinding(attrPath);
              if (binding) {
                this.statementsToRemove.push(binding.path as NodePath<Statement>);
                for (let ref of binding.referencePaths) {
                  if (!isJSXExpressionContainer(ref.parentPath.node) && !isConsoleLogStatement(ref.node)) {
                    this.statementsToRemove.push(ref.getStatementParent() as NodePath<Statement>);
                  }
                }
              }
            }
            let firstClass = classAttrs.shift()!;
            firstClass.replaceWith(newClassAttr);
            for (let attrPath of classAttrs) {
                attrPath.remove();
            }
          }
        }
      }
    };
  };
}
