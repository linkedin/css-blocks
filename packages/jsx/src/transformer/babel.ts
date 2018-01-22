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
  importDefaultSpecifier,
  jSXAttribute,
  jSXExpressionContainer,
  jSXIdentifier,
  ImportDeclaration,
  JSXOpeningElement,
  Statement,
  isJSXExpressionContainer,
  JSXAttribute,
  Node,
  AssignmentExpression,
  Identifier,
  Expression,
} from 'babel-types';

import isBlockFilename from '../utils/isBlockFilename';
import { classnamesHelper as generateClassName, HELPER_FN_NAME } from './classNameGenerator';
// import { TemplateAnalysisError } from '../utils/Errors';
import * as debugGenerator from 'debug';

const debug = debugGenerator('css-blocks:jsx');

let { parse } = require('path');

export interface CssBlocksVisitor {
  dynamicStylesFound: boolean;
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
        this.dynamicStylesFound = false;
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
          debug(`Rewriting discovered dependency ${this.filename}`);
          this.elementAnalyzer = new JSXElementAnalyzer(this.analysis.blocks, this.filename);
        }
      },
      post(state: any) {
        for (let nodePath of this.statementsToRemove) {
          if (nodePath.removed) { continue; }
          nodePath.remove();
        }
        if (this.dynamicStylesFound) {
          let firstImport = this.importsToRemove.shift()!;
          detectStrayReferenceToImport(firstImport, this.filename);
          let importDecl = importDeclaration(
            [importDefaultSpecifier(identifier(HELPER_FN_NAME))],
            stringLiteral('@css-blocks/runtime'));
          firstImport.replaceWith(importDecl);
        }
        for (let nodePath of this.importsToRemove) {
          if (nodePath.removed) { continue; }
          detectStrayReferenceToImport(nodePath, this.filename);
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

        AssignmentExpression(path: NodePath<AssignmentExpression>): void {
          if (!this.shouldProcess) return;

          let elementAnalysis = this.elementAnalyzer.analyzeAssignment(path);
          if (elementAnalysis) {
            elementAnalysis.seal();
            let classMapping = this.mapping.simpleRewriteMapping(elementAnalysis);
            let className: Expression | undefined = undefined;
            if (classMapping.dynamicClasses.length > 0) {
              className = generateClassName(classMapping, elementAnalysis, HELPER_FN_NAME, true);
            } else {
              className = stringLiteral(classMapping.staticClasses.join(' '));
            }
            let right = path.get('right');
            if (right.isIdentifier()) {
              let binding = right.scope.getBinding((<Identifier>right.node).name);
              if (binding && binding.path.isVariableDeclarator()) {
                let init = binding.path.get('init');
                init.replaceWith(className);
                return;
              }
            }
            right.replaceWith(className);
          }
        },

        JSXOpeningElement(path: NodePath<JSXOpeningElement>, state: any): void {
          if (!this.shouldProcess) { return; }
          let elementAnalysis = this.elementAnalyzer.analyzeJSXElement(path);
          if (elementAnalysis) {
            elementAnalysis.seal();
            let classMapping = this.mapping.simpleRewriteMapping(elementAnalysis);
            let attributeValue: JSXAttribute['value'] | undefined = undefined;
            let newClassAttr: JSXAttribute | undefined = undefined;
            if (classMapping.dynamicClasses.length > 0) {
              this.dynamicStylesFound = true;
              attributeValue = jSXExpressionContainer(
                generateClassName(classMapping, elementAnalysis, HELPER_FN_NAME, true));
            } else if (classMapping.staticClasses.length > 0) {
              attributeValue = stringLiteral(classMapping.staticClasses.join(' '));
            }
            if (attributeValue) {
              newClassAttr = jSXAttribute(jSXIdentifier('class'), attributeValue);
            }

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
            if (newClassAttr) {
              let firstClass = classAttrs.shift()!;
              //insert and remove instead of replace or else it's hard to
              //detect if the old node was removed or is a stray reference.
              firstClass.insertAfter(newClassAttr);
              firstClass.remove();
            }
            for (let attrPath of classAttrs) {
                attrPath.remove();
            }
          }
        }
      }
    };
  };
}

function detectStrayReferenceToImport(
  importDeclPath: NodePath<ImportDeclaration>,
  filename: string
): void {
  if (!importDeclPath || !importDeclPath.node) { return; }
  for (let specifier of importDeclPath.node.specifiers) {
    let binding = importDeclPath.scope.getBinding(specifier.local.name);
    if (binding) {
      for (let ref of binding.referencePaths) {
        if (ref.type === 'Identifier'
            && (<Identifier>ref.node).name === specifier.local.name
            && !isRemoved(ref)) {
          console.warn(`WARNING: Stray reference to block import (${specifier.local.name}). Imports are removed during rewrite so this will probably be a runtime error. (${filename}:${ref.node.loc.start.line}:${ref.node.loc.start.column})`);
          // throw new TemplateAnalysisError(`Stray reference to block import (${specifier.local.name}). Imports are removed during rewrite.`, {filename, ...ref.node.loc.start});
        }
      }
    }
  }
}

function isRemoved(path: NodePath<Node>): boolean {
  let p = path;
  while (p && p.type !== 'Program') {
    if (p.removed || p.parentPath.removed) return true;
    if (p.inList) {
      let list = p.parentPath.get(p.listKey);
      if (!Array.isArray(list)) return true;
      let element = list[p.key];
      if (!element) return true;
      if (element.node !== p.node) return true;
    } else {
      if (p.parentPath.get(p.parentKey).node !== p.node) {
        return true;
      }
    }
    p = p.parentPath;
  }
  return false;
}