import { AST, preprocess, traverse } from '@glimmer/syntax';
import {
  Block,
  BlockClass,
  BlockObject,
  State,
  QueryKeySelector,
  TemplateAnalysis as SingleTemplateStyleAnalysis,
  MetaTemplateAnalysis as MetaStyleAnalysis,
  TemplateAnalyzer,
  MultiTemplateAnalyzer,
  PluginOptionsReader,
  BlockFactory
} from "css-blocks";
import Project from "./project";
import { ResolvedFile } from "./GlimmerProject";
import DependencyAnalyzer from "glimmer-analyzer";
import * as debugGenerator from "debug";
import { selectorCount, cssBlockError } from "./utils";
import * as values from 'object.values';

export type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;
const STYLE_IF = 'style-if';
const STYLE_UNLESS = 'style-unless';

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
    this.debug("Analyzing template: ", componentName);
    let template: ResolvedFile;
    try {
      template = this.project.templateFor(componentName);
    } catch (e) {
      if (/Couldn't find template/.test(e.message)) {
        return Promise.resolve(null);
      } else {
        throw e;
      }
    }
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
          analysis.startElement({
            line: node.loc.start.line,
            column: node.loc.start.column
          });
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
                throw cssBlockError(`Cannot apply a block state without a block class or root`, n, template);
              }
            }
          });
        },
      });
      if (this.debug.enabled) {
        if (analysis.currentElement) {
          let objects = analysis.currentElement.correlations.map(l => new Array(...l).map(o => o && o.asSource()));
          this.debug(`Found correlated styles: ${objects.join(', ')}`);
        }
      }
      analysis.endElement();
      return analysis;
    }).catch((error) => {
      if (/File not found for stylesheet/.test(error.message)) {
        return null;
      } else {
        throw error;
      }
    });
  }

  private isStyleIfHelper( node: AST.MustacheStatement ): string | undefined {
    if ( node.path.type !== 'PathExpression' ) { return undefined; }
    let parts: string[] = (<AST.PathExpression>node.path).parts;
    if ( parts.length !== 1 || ( parts[0] !== STYLE_IF &&  parts[0] !== STYLE_UNLESS ) ) { return undefined; }
    return parts[0];
  }

  private processClass(node: AST.AttrNode, block: Block, analysis: SingleTemplateStyleAnalysis<ResolvedFile>, debugPath: string, template: ResolvedFile): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    let statements: (AST.TextNode | AST.MustacheStatement)[];

    statements = node.value.type === 'ConcatStatement' ? (<AST.ConcatStatement>node.value).parts : [node.value];

    statements.forEach((statement) => {
      if (statement.type === "TextNode") {
        let classNames = (<AST.TextNode>statement).chars.split(/\s+/);

        classNames.forEach((name) => {
          let found = block.lookup(name) || block.lookup(`.${name}`);
          if (found) {
            blockObjects.push(<Block | BlockClass>found);
            analysis.addStyle(found);
          }
        });
      }

      else if ( statement.type === 'MustacheStatement' ) {
        let value = statement as AST.MustacheStatement;
        let helperName = this.isStyleIfHelper(value);
        if ( helperName ) {
          if ( value.params[1] && value.params[1].type !== 'StringLiteral' ) {
            throw cssBlockError(`{{${helperName}}} expects a block or block class as its second argument at ${debugPath}.`, node, template);
          }
          let name: string = (value.params[1] as AST.StringLiteral).value;
          let found = block.lookup(name) || block.lookup(`.${name}`);
          if (found) {
            blockObjects.push(<Block | BlockClass>found);

            // Discover our optional `else` block in the `{{style-* condition 'if-block' 'else-block'}}` helper
            let name2: string = value.params[2] && (value.params[2] as AST.StringLiteral).value;
            let found2 = name2 ? ( block.lookup(name2) || block.lookup(`.${name2}`) ) : undefined;
            if (found2) {
              blockObjects.push(<Block | BlockClass>found2);
              analysis.addExclusiveStyles(true, found, found2);
            }
            else {
              analysis.addStyle(found, true);
            }

          }
          else {
            throw cssBlockError(`No class ${name} found in block ${block.name} at ${debugPath}.`, statement, template);
          }
        }

        else {
          throw cssBlockError(`Only {{style-if}} or {{style-unless}} helpers are allowed in class attributes at ${debugPath}.`, node, template);
        }
      }
    });

    return blockObjects;
  }

  private localBlockName(defaultBlock: Block, o: BlockObject): string | null {
    if (o.block === defaultBlock) {
      return defaultBlock.name;
    } else {
      let blockName: string | null = null;
      defaultBlock.eachBlockReference((name, block) => {
        if (block === o.block) {
          blockName = name;
        }
      });
      return blockName;
    }
  }

  private processState(qualifiedStateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[], analysis: SingleTemplateStyleAnalysis<ResolvedFile>, stylesheetPath: string, template: ResolvedFile) {
    let blockName: string | undefined;
    let stateName: string;
    let md = qualifiedStateName.match(/^([^\.]+)\.([^\.]+)$/);
    let stateBlock = block;
    if (md && md.index === 0) {
      blockName = <string>md[1];
      stateName = <string>md[2];
      let tStateBlock = block.getReferencedBlock(blockName);
      if (tStateBlock) {
        stateBlock = tStateBlock;
      } else {
        throw cssBlockError(`No block referenced as ${blockName}`, node, template);
      }
    } else {
      stateName = qualifiedStateName;
    }

    let container = stateContainers.find((c) => c.block === stateBlock);
    if (!container) {
      let message = `Element with state:${qualifiedStateName} lacks a class from the block ${blockName || stateBlock.name}.`;
      if (stateContainers.length > 0) {
        message += ` Element has classes from the following blocks: ${stateContainers.map(c => this.localBlockName(block, c.block))}`;
      } else {
        message += ` Element has no class assigned to it.`;
      }
      throw cssBlockError(message, node, template);
    }
    let substateName: string | undefined;

    if (node.value) {
      let isDynamic = (node.value.type !== "TextNode");
      substateName = !isDynamic ? (node.value as AST.TextNode).chars : undefined;

      let statesList: State[] = values(container.states.resolveGroup(stateName, substateName) || {});

      // If this is a static state, and we've discovered more than one matching
      // state, then they did not provide the required a substate. Throw.
      if ( !isDynamic && statesList.length > 1 ) {
        throw cssBlockError(`State ${stateName} in block ${container.block.name} at ${stylesheetPath} requires a substate value.`, node, template);
      }

      // If we didn't find any mathing states, throw.
      if ( !statesList.length ) {
        if (substateName) {
          throw cssBlockError(`No state ${stateName}=${substateName} found in block at ${stylesheetPath}`, node, template);
        } else {
          throw cssBlockError(`No state ${stateName} found in block at ${stylesheetPath}`, node, template);
        }
      }

      // Add discovered states to analysis.
      (isDynamic) ? analysis.addExclusiveStyles(false, ...statesList) : analysis.addStyle(statesList[0]);

    }
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

  get blockFactory(): BlockFactory {
    return this.project.blockFactory;
  }
}

export class HandlebarsTransitiveStyleAnalyzer extends BaseStyleAnalyzer implements MultiTemplateAnalyzer<ResolvedFile> {
  project: Project;
  templateNames: string[];

  constructor(project: Project | string, ...templateNames: string[]) {
    super(project);
    this.templateNames = templateNames;
  }

  reset() {
    this.project.reset();
  }

  get blockFactory(): BlockFactory {
    return this.project.blockFactory;
  }

  analyze(): Promise<MetaStyleAnalysis<ResolvedFile>> {
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir); // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1

    let components = new Set<string>();
    let analysisPromises: Promise<SingleTemplateStyleAnalysis<ResolvedFile> | null>[] = [];
    this.debug(`Analyzing all templates starting with: ${this.templateNames}`);

    this.templateNames.forEach(templateName => {
      components.add(templateName);
      let componentDeps = depAnalyzer.recursiveDependenciesForTemplate(templateName);
      componentDeps.components.forEach(c => components.add(c));
    });
    if (this.debug.enabled) {
      this.debug(`Analzying all components: ${[...components].join(", ")}`);
    }
    components.forEach(dep => {
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
