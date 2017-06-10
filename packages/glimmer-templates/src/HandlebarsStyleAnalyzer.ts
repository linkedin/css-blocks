import Resolver from '@glimmer/resolver';
import { AST, preprocess, traverse } from '@glimmer/syntax';
import {
  Block,
  BlockClass,
  BlockObject,
  BlockParser,
  PluginOptions,
  PluginOptionsReader,
  CssBlockError,
  QueryKeySelector,
  ClassifiedParsedSelectors,
  TemplateAnalysis as StyleAnalysis,
  MetaTemplateAnalysis as MetaStyleAnalysis
} from "css-blocks";
import Project, { ResolvedFile } from "./project";
import { pathFromSpecifier } from "./utils";
import DependencyAnalyzer from "glimmer-analyzer";

export type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;

export class HandlebarsStyleAnalyzer {
  project: Project;

  constructor(project: Project | string) {
    if (typeof project === "string") {
      this.project = new Project(project);
    } else {
      this.project = project;
    }
  }

 persformTransitiveAnalysis(templateName: string): Promise<MetaStyleAnalysis> {
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir); // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1
    let componentDeps = depAnalyzer.recursiveDependenciesForTemplate(templateName);
    let analysisPromises: Promise<StyleAnalysis>[] = [];
    componentDeps.components.forEach(dep => {
      analysisPromises.push(this.performAnalysis(dep))
    });
    return Promise.all(analysisPromises).then((analyses)=> {
      let metaAnalysis = new MetaStyleAnalysis();
      metaAnalysis.addAllAnalyses(analyses);
      return metaAnalysis;
    });
  }

  performAnalysis(templateName: string): Promise<StyleAnalysis> {
    let template = this.project.templateFor(templateName);
    let analysis = new StyleAnalysis(template);
    let ast = preprocess(template.string);
    let elementCount = 0;
    let elementStyles: string[] = [];
    let self = this;
    let result = this.project.blockFor(templateName);

    return result.then((block) => {
      analysis.blocks[""] = block;
      block.eachBlockReference((name, refBlock) => {
        analysis.blocks[name] = refBlock;
      });
      traverse(ast, {
        ElementNode(node) {
          analysis.endElement();
          analysis.startElement();
          elementCount++;
          let atRootElement = (elementCount === 1);
          // If there are root styles, we add them on the root element implicitly. The rewriter will add the block's root class.
          if (atRootElement) {
            let query = new QueryKeySelector(block);
            if (block.root) {
              let res = query.execute(block.root, block);
              if (self.selectorCount(res) > 0) {
                analysis.addStyle(block);
              }
            }
          }
          let classObjects: StateContainer[] | undefined = undefined;
          node.attributes.forEach((n) => {
            if (n.name === "class") {
              classObjects = self.processClass(n, block, analysis, block.source, template);
              self.validateClasses(block, atRootElement, classObjects, node, template);
            }
          });
          node.attributes.forEach((n) => {
            if (n.name.match(STATE)) {
              let stateContainers: StateContainer[] = classObjects ? classObjects.slice() : [];
              if (atRootElement) {
                stateContainers.unshift(block);
              }
              if (stateContainers.length > 0) {
                self.processState(RegExp.$1, n, block, stateContainers, analysis, block.source, template);
              } else {
                throw self.cssBlockError(`Cannot apply a block state without a block class or root`, n, template);
              }
            }
          });
        },
      });
      analysis.endElement();
      return analysis;
    });
  }

  validateClasses(block: Block, atRootElement: boolean, objects: BlockObject[], node: AST.Node, template: ResolvedFile) {
    if (atRootElement && objects.length > 0) {
      objects.forEach((obj) => {
        if (obj.block === block) {
          throw this.cssBlockError(`Cannot put block classes on the block's root element`, node, template);
        }
      });
    }
    let blocks = new Set<Block>();
    objects.forEach((o) => {
      if (blocks.has(o.block)) {
        throw this.cssBlockError(`Multiple classes from the same block on an element are not allowed.`, node, template);
      } else {
        blocks.add(o.block);
      }
    });
  }

  processClass(node: AST.AttrNode, block: Block, analysis: StyleAnalysis, stylesheetPath: string, template: ResolvedFile): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    if (node.value.type === "TextNode") {
      let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
      classNames.forEach((name) => {
        let found = block.find(name) || block.find(`.${name}`);
        if (found) {
          blockObjects.push(<Block | BlockClass>found);
          analysis.addStyle(found);
        } else {
          throw this.cssBlockError(`No class ${name} found in block at ${stylesheetPath}`, node, template);
        }
      });
    }
    return blockObjects;
  }

  processState(stateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[], analysis: StyleAnalysis, stylesheetPath: string, template: ResolvedFile) {
    let blockName: string | undefined;
    let md = stateName.match(/^([^\.]+)\.([^\.]+)$/);
    let stateBlock = block;
    if (md && md.index === 0) {
      blockName = md[1];
      stateName = md[2];
      let tStateBlock = block.getReferencedBlock(blockName);
      if (tStateBlock) {
        stateBlock = tStateBlock;
      } else {
        throw this.cssBlockError(`No block referenced as ${blockName}`, node, template);
      }
    }

    let container = stateContainers.find((c) => c.block === stateBlock);
    if (!container) {
      throw this.cssBlockError(`Element lacks a class from the corresponding block`, node, template);
    }
    let substateName: string | null = null;
    if (node.value && node.value.type === "TextNode" && node.value.chars) {
      substateName = node.value.chars;
      let state = container.states.getState(substateName, stateName);
      if (state) {
        analysis.addStyle(state);
      } else {
        throw this.cssBlockError(`No state ${stateName}=${node.value.chars} found in block at ${stylesheetPath}`, node, template);
      }
    } else if (node.value && node.value.type !== "TextNode") {
      // dynamic stuff will go here
      throw this.cssBlockError("No handling for dynamic styles yet", node, template);
    } else {
      let state = container.states.getState(stateName);
      if (state) {
        analysis.addStyle(state);
      } else {
        throw this.cssBlockError(`No state ${stateName} found in block at ${stylesheetPath}`, node, template);
      }
    }
  }

  cssBlockError(message: string, node: AST.Node, template: ResolvedFile) {
    return new CssBlockError(message, {
      filename: node.loc.source || template.path,
      line: node.loc.start.line,
      column: node.loc.start.column
    })
  }

  selectorCount(result: ClassifiedParsedSelectors) {
    let count = result.main.length;
    Object.keys(result.other).forEach((k) => {
      count += result.other[k].length;
    });
    return count;
  }

  isComponentHelper({ path }: AST.MustacheStatement) {
    return path.type === 'PathExpression'
      && path.parts.length === 1
      && path.parts[0] === 'component';
  }
}