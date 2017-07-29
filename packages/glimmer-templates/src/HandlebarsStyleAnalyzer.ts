import { AST, preprocess, traverse } from '@glimmer/syntax';
import {
  Block,
  BlockClass,
  BlockObject,
  CssBlockError,
  QueryKeySelector,
  TemplateAnalysis as SingleTemplateStyleAnalysis,
  MetaTemplateAnalysis as MetaStyleAnalysis,
  TemplateAnalyzer,
  MultiTemplateAnalyzer,
  PluginOptionsReader
} from "css-blocks";
import Project from "./project";
import { ResolvedFile } from "./GlimmerProject";
import DependencyAnalyzer from "glimmer-analyzer";
import * as debugGenerator from "debug";
import { selectorCount } from "./utils";

export type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;

export class BaseStyleAnalyzer {
  project: Project;
  debug: debugGenerator.IDebugger;
  options: PluginOptionsReader;

  constructor(project: Project | string) {
    if (typeof project === "string") {
      this.project = new Project(project);
    } else {
      this.project = project;
    }
    this.debug = debugGenerator("css-blocks:glimmer");
    this.options = new PluginOptionsReader(this.project.cssBlocksOpts);
  }

  protected analyzeTemplate(componentName: string): Promise<SingleTemplateStyleAnalysis<ResolvedFile> | null> {
    let template = this.project.templateFor(componentName);
    let analysis = new SingleTemplateStyleAnalysis(template);
    let ast = preprocess(template.string);
    let elementCount = 0;
    let self = this;
    let blockIdentifier = this.project.blockImporter.identifier(template.identifier, "stylesheet:", this.options);
    let result = this.project.blockFactory.getBlock(blockIdentifier);

    return result.then((block) => {
      if (!block) {
        self.debug(`Analyzing ${componentName}. No block for component. Returning empty analysis.`);
        return analysis;
      } else {
        self.debug(`Analyzing ${componentName}. Got block for component.`);
      }
      let blockDebugPath = self.options.importer.debugIdentifier(block.identifier, this.options);
      analysis.blocks[""] = block;
      block.eachBlockReference((name, refBlock) => {
        analysis.blocks[name] = refBlock;
      });
      let localBlockNames = Object.keys(analysis.blocks).map(n => n === "" ? "<default>" : n);
      self.debug(`Analyzing ${componentName}. ${localBlockNames.length} blocks in scope: ${localBlockNames.join(', ')}.`);
      traverse(ast, {
        ElementNode(node) {
          analysis.endElement();
          analysis.startElement();
          elementCount++;
          let atRootElement = (elementCount === 1);

          // If there are root styles, we add them on the root element implicitly.
          // The rewriter will add the block's root class.
          if (atRootElement) {
            let query = new QueryKeySelector(block);
            if (block.root) {
              let res = query.execute(block.root, block);
              if (selectorCount(res) > 0) {
                analysis.addStyle(block);
              }
            }
          }

          let classObjects: StateContainer[] | undefined = undefined;
          node.attributes.forEach((n) => {
            if (n.name === "class") {
              classObjects = self.processClass(n, block, analysis, blockDebugPath, template);
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
                self.processState(RegExp.$1, n, block, stateContainers, analysis, blockDebugPath, template);
              } else {
                throw self.cssBlockError(`Cannot apply a block state without a block class or root`, n, template);
              }
            }
          });
        },
      });
      if (this.debug.enabled) {
        if (analysis.currentCorrelation && analysis.currentCorrelation.size > 1) {
          let objects = new Array(...analysis.currentCorrelation).map(o => o.asSource());
          this.debug(`Found correlated styles: ${objects.join(', ')}`);
        }
      }
      analysis.endElement();
      return analysis;
    }).catch((_error) => {
      return null;
    });
  }

  private validateClasses(block: Block, atRootElement: boolean, objects: BlockObject[], node: AST.Node, template: ResolvedFile) {
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

  private processClass(node: AST.AttrNode, block: Block, analysis: SingleTemplateStyleAnalysis<ResolvedFile>, debugPath: string, template: ResolvedFile): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    if (node.value.type === "TextNode") {
      let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
      classNames.forEach((name) => {
        let found = block.lookup(name) || block.lookup(`.${name}`);
        if (found) {
          blockObjects.push(<Block | BlockClass>found);
          analysis.addStyle(found);
        } else {
          throw this.cssBlockError(`No class ${name} found in block at ${debugPath}`, node, template);
        }
      });
    }
    return blockObjects;
  }

  private processState(stateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[], analysis: SingleTemplateStyleAnalysis<ResolvedFile>, stylesheetPath: string, template: ResolvedFile) {
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
    let substateName: string | undefined;

    if (node.value) {
      substateName = (node.value.type === "TextNode") ? node.value.chars : undefined;
      let states = container.states.getGroup(stateName, substateName);
      if (states) {
        states.forEach((state) => {
          analysis.addStyle(state);
        });
      } else {
        if (substateName) {
          throw this.cssBlockError(`No state ${stateName}=${substateName} found in block at ${stylesheetPath}`, node, template);
        } else {
          throw this.cssBlockError(`No state ${stateName} found in block at ${stylesheetPath}`, node, template);
        }
      }
    }
  }

  private cssBlockError(message: string, node: AST.Node, template: ResolvedFile) {
    return new CssBlockError(message, {
      filename: node.loc.source || template.identifier,
      line: node.loc.start.line,
      column: node.loc.start.column
    });
  }
}

export class HandlebarsStyleAnalyzer extends BaseStyleAnalyzer implements TemplateAnalyzer<ResolvedFile> {
  project: Project;
  templateName: string;

  constructor(project: Project | string, templateName: string) {
    super(project);
    this.templateName = templateName;
  }

  analyze(): Promise<SingleTemplateStyleAnalysis<ResolvedFile>> {
    return this.analyzeTemplate(this.templateName).then(result => {
      if (result === null) {
        throw new Error(`No stylesheet for ${this.templateName}`);
      } else {
        return result;
      }
    });
  }

  reset() {
    this.project.reset();
  }
}

export class HandlebarsTransitiveStyleAnalyzer extends BaseStyleAnalyzer implements MultiTemplateAnalyzer<ResolvedFile> {
  project: Project;
  templateName: string;

  constructor(project: Project | string, templateName: string) {
    super(project);
    this.templateName = templateName;
  }

  reset() {
    this.project.reset();
  }

  analyze(): Promise<MetaStyleAnalysis<ResolvedFile>> {
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir); // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1
    let componentDeps = depAnalyzer.recursiveDependenciesForTemplate(this.templateName);
    let analysisPromises: Promise<SingleTemplateStyleAnalysis<ResolvedFile> | null>[] = [];
    analysisPromises.push(this.analyzeTemplate(this.templateName));
    componentDeps.components.forEach(dep => {
      analysisPromises.push(this.analyzeTemplate(dep));
    });
    return Promise.all(analysisPromises).then((analyses)=> {
      let metaAnalysis = new MetaStyleAnalysis<ResolvedFile>();
      analyses.forEach(a => {
        if (a !== null) {
          metaAnalysis.addAnalysis(a);
        }
      });
      return metaAnalysis;
    });
  }
}
