import {
  Analysis,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
} from "@css-blocks/core";
import { PluginObj } from "babel-core";
import { NodePath } from "babel-traverse";
import {
  AssignmentExpression,
  Expression,
  Identifier,
  ImportDeclaration,
  JSXAttribute,
  JSXOpeningElement,
  Node,
  Statement,
  identifier,
  importDeclaration,
  importDefaultSpecifier,
  isIdentifier,
  isJSXExpressionContainer,
  jSXAttribute,
  jSXExpressionContainer,
  jSXIdentifier,
  stringLiteral,
} from "babel-types";
// import { TemplateAnalysisError } from '../utils/Errors';
import * as debugGenerator from "debug";

import { TEMPLATE_TYPE } from "../Analyzer/Template";
import { JSXElementAnalyzer } from "../Analyzer/visitors/element";
import { isBlockFilename } from "../utils/isBlockFilename";
import { isConsoleLogStatement } from "../utils/isConsoleLogStatement";

import { HELPER_FN_NAME, classnamesHelper as generateClassName } from "./classNameGenerator";
import { CSSBlocksJSXTransformer as Rewriter } from "./index";

const debug = debugGenerator("css-blocks:jsx:rewriter");

let { parse } = require("path");

export interface CssBlocksVisitor {
  dynamicStylesFound: boolean;
  importsToRemove: Array<NodePath<ImportDeclaration>>;
  statementsToRemove: Array<NodePath<Statement>>;
  elementAnalyzer: JSXElementAnalyzer;
  filename: string;
  mapping: StyleMapping<TEMPLATE_TYPE>;
  analysis: Analysis<TEMPLATE_TYPE> | undefined;
  cssBlockOptions: CSSBlocksConfiguration;
  shouldProcess: boolean;
}

const CAN_PARSE_EXTENSIONS = {
  ".js": true,
  ".tsx": true,
  ".jsx": true,
};

interface BabelFile {
  opts: {
    filename: string;
  };
}

export function makePlugin(transformOpts: { rewriter: Rewriter }): () => PluginObj<CssBlocksVisitor> {
  const rewriter = transformOpts.rewriter;
  debug(`Made Rewriter`);

  return function transform(): PluginObj<CssBlocksVisitor> {

    return {
      pre(file: BabelFile) {
        debug(`Encountered file for rewrite: ${file}`);
        this.dynamicStylesFound = false;
        this.importsToRemove = new Array<NodePath<ImportDeclaration>>();
        this.statementsToRemove = new Array<NodePath<Statement>>();
        this.filename = file.opts.filename;

        this.mapping = rewriter.blocks[this.filename];
        if (this.mapping && this.mapping.analyses) {
          this.analysis = this.mapping.analyses.find(a => a.template.identifier === this.filename);
        } else {
          this.shouldProcess = false;
        }
        let ext = parse(this.filename).ext;
        this.shouldProcess = CAN_PARSE_EXTENSIONS[ext] && this.analysis && this.analysis.blockCount() > 0 || false;

        if (this.analysis && this.shouldProcess) {
          debug(`Rewriting discovered dependency ${this.filename}`);
          // TODO: We use this to re-analyze elements in the rewriter.
          //       We've already done this work and should be able to
          //       re-use the data! Unfortunately, there are problems...
          //       See: https://github.com/linkedin/css-blocks/issues/84
          this.elementAnalyzer = new JSXElementAnalyzer(this.analysis, true);
        }
      },
      post() {
        for (let nodePath of this.statementsToRemove) {
          if (nodePath.removed) { continue; }
          nodePath.remove();
        }
        if (this.dynamicStylesFound) {
          let firstImport = this.importsToRemove.shift()!;
          detectStrayReferenceToImport(firstImport, this.filename);
          let importDecl = importDeclaration(
            [importDefaultSpecifier(identifier(HELPER_FN_NAME))],
            stringLiteral("@css-blocks/runtime"));
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
            debug(`will remove import import of ${nodePath.node.source.value}`);
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
              className = stringLiteral(classMapping.staticClasses.join(" "));
            }
            let right = path.get("right");
            if (isIdentifier(right.node)) {
              let binding = right.scope.getBinding(right.node.name);
              if (binding && binding.path.isVariableDeclarator()) {
                let init = binding.path.get("init");
                init.replaceWith(className);
                return;
              }
            }
            right.replaceWith(className);
          }
        },

        JSXOpeningElement(path: NodePath<JSXOpeningElement>): void {
          if (!this.shouldProcess) { return; }
          let elementAnalysis = this.elementAnalyzer.analyzeJSXElement(path);
          if (elementAnalysis) {
            elementAnalysis.seal();
            let classMapping = this.mapping.simpleRewriteMapping(elementAnalysis);
            let attributeValue: JSXAttribute["value"] | undefined = undefined;
            let newClassAttr: JSXAttribute | undefined = undefined;
            if (classMapping.dynamicClasses.length > 0) {
              this.dynamicStylesFound = true;
              attributeValue = jSXExpressionContainer(
                generateClassName(classMapping, elementAnalysis, HELPER_FN_NAME, true));
            } else if (classMapping.staticClasses.length > 0) {
              attributeValue = stringLiteral(classMapping.staticClasses.join(" "));
            }
            if (attributeValue) {
              newClassAttr = jSXAttribute(jSXIdentifier("className"), attributeValue);
            }

            let classAttrs = this.elementAnalyzer.classAttributePaths(path);
            for (let attrPath of classAttrs) {
              let binding = this.elementAnalyzer.styleVariableBinding(attrPath);
              if (binding) {
                this.statementsToRemove.push(binding.path as NodePath<Statement>);
                for (let ref of binding.referencePaths) {
                  if (!isJSXExpressionContainer(ref.parentPath.node) && !isConsoleLogStatement(ref.node)) {
                    this.statementsToRemove.push(ref.getStatementParent());
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
        },
      },
    };
  };
}

function detectStrayReferenceToImport(
  importDeclPath: NodePath<ImportDeclaration>,
  filename: string,
): void {
  if (!importDeclPath || !importDeclPath.node) { return; }
  for (let specifier of importDeclPath.node.specifiers) {
    let binding = importDeclPath.scope.getBinding(specifier.local.name);
    if (binding) {
      for (let ref of binding.referencePaths) {
        if (ref.type === "Identifier"
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
  while (p && p.type !== "Program") {
    if (p.removed || p.parentPath.removed) return true;
    if (p.inList) {
      let list = p.parentPath.get(p.listKey);
      if (!Array.isArray(list)) return true;
      let element = list[p.key];
      if (!element) return true;
      if (element.node !== p.node) return true;
    } else {
      let parent = p.parentPath.get(p.parentKey);
      if (Array.isArray(parent) || parent.node !== p.node) {
        return true;
      }
    }
    p = p.parentPath;
  }
  return false;
}
