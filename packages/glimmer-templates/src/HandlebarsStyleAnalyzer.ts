import { preprocess, traverse } from "@glimmer/syntax";
import {
  Analyzer,
  Block,
  BlockClass,
  ResolvedConfiguration as CSSBlocksConfiguration,
  PluginOptions,
  AnalysisOptions,
  PluginOptionsReader,
  Analysis,
} from "css-blocks";
import * as debugGenerator from "debug";
import DependencyAnalyzer from "glimmer-analyzer";

import { ElementAnalyzer } from "./ElementAnalyzer";
import { ResolvedFile } from "./GlimmerProject";
import { Project } from "./project";

export type AttributeContainer = Block | BlockClass;

export type TEMPLATE_TYPE = "GlimmerTemplates.ResolvedFile";

export class HandlebarsAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  project: Project;
  debug: debugGenerator.IDebugger;
  options: CSSBlocksConfiguration;

  constructor(
    project: Project | string,
    options?: PluginOptions,
    analysisOpts?: AnalysisOptions,
  ) {
    super(options, analysisOpts);
    if (typeof project === "string") {
      this.project = new Project(project);
    } else {
      this.project = project;
    }
    this.debug = debugGenerator("css-blocks:glimmer");
    this.options = this.project.cssBlocksOpts;
  }

  reset() {
    this.project.reset();
  }

  async analyze(...templateNames: string[]): Promise<Analysis[]> {

    // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir);

    let components = new Set<string>();
    let analysisPromises: Promise<Analysis>[] = [];
    this.debug(`Analyzing all templates starting with: ${templateNames}`);

    templateNames.forEach(templateName => {
      components.add(templateName);
      let componentDeps = depAnalyzer.recursiveDependenciesForTemplate(templateName);
      componentDeps.components.forEach(c => components.add(c));
    });

    this.debug(`Analyzing all components: ${[...components].join(", ")}`);

    components.forEach(dep => {
      analysisPromises.push(this.analyzeTemplate(dep));
    });

    let analyses = await Promise.all(analysisPromises);
    analyses.forEach(a => { this.addAnalysis(a); });
    return analyses;
  }

  protected analyzeTemplate(componentName: string): Promise<Analysis> {
    this.debug("Analyzing template: ", componentName);
    let template: ResolvedFile = this.project.templateFor(componentName);
    let analysis = new Analysis(template);
    let ast = preprocess(template.string);
    let elementCount = 0;
    let self = this;
    let blockIdentifier = this.project.blockImporter.identifier(template.identifier, "stylesheet:", this.options);
    console.log("ID", blockIdentifier);
    let result = this.project.blockFactory.getBlock(blockIdentifier);

    return result.then((block) => {
      if (!block) {
        self.debug(`Analyzing ${componentName}. No block for component. Returning empty analysis.`);
        return analysis;
      } else {
        self.debug(`Analyzing ${componentName}. Got block for component.`);
      }
      let elementAnalyzer = new ElementAnalyzer(block, template, this.options);
      analysis.blocks[""] = block;
      block.eachBlockReference((name, refBlock) => {
        analysis.blocks[name] = refBlock;
      });
      let localBlockNames = Object.keys(analysis.blocks).map(n => n === "" ? "<default>" : n);
      self.debug(`Analyzing ${componentName}. ${localBlockNames.length} blocks in scope: ${localBlockNames.join(", ")}.`);
      traverse(ast, {
        ElementNode(node) {
          elementCount++;
          let atRootElement = (elementCount === 1);
          let element = elementAnalyzer.analyze(node, atRootElement);
          analysis.addElement(element);
          if (self.debug.enabled) self.debug("Element analyzed:", element.forOptimizer(self.options).toString());
        },
      });
      return analysis;
    });
  }
}
