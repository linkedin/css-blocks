import { preprocess, traverse } from "@glimmer/syntax";
import { TemplateIntegrationOptions } from "@opticss/template-api";
import {
  Analysis,
  AnalysisOptions,
  Analyzer,
  Block,
  BlockClass,
  Options,
  ResolvedConfiguration as CSSBlocksConfiguration,
} from "css-blocks";
import * as debugGenerator from "debug";
import DependencyAnalyzer from "glimmer-analyzer";

import { ElementAnalyzer } from "./ElementAnalyzer";
import { ResolvedFile } from "./GlimmerProject";
import { Project } from "./project";

export type AttributeContainer = Block | BlockClass;
export type TEMPLATE_TYPE = "GlimmerTemplates.ResolvedFile";
export type GlimmerAnalysis = Analysis<TEMPLATE_TYPE>;

export class GlimmerAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  project: Project;
  debug: debugGenerator.IDebugger;
  options: CSSBlocksConfiguration;

  constructor(
    project: Project | string,
    options?: Options,
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
    super.reset();
    this.project.reset();
  }

  get optimizationOptions(): TemplateIntegrationOptions {
    return {
      rewriteIdents: {
        id: false,
        class: true,
        omitIdents: {
          id: [],
          class: [],
        },
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }

  async analyze(...templateNames: string[]): Promise<GlimmerAnalyzer> {

    // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir);

    let components = new Set<string>();
    let analysisPromises: Promise<GlimmerAnalysis>[] = [];
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

    await Promise.all(analysisPromises);
    return this;
  }

  private async resolveBlock(template: ResolvedFile): Promise<Block | undefined> {
    try {
      let blockIdentifier = this.project.blockImporter.identifier(template.identifier, "stylesheet:", this.options);
      return await this.project.blockFactory.getBlock(blockIdentifier);
    } catch (e) {
      this.debug(`Analyzing ${template.identifier}. No block for component. Returning empty analysis.`);
      return undefined;
    }
  }

  protected async analyzeTemplate(componentName: string): Promise<GlimmerAnalysis> {
    this.debug("Analyzing template: ", componentName);
    let template: ResolvedFile = this.project.templateFor(componentName);
    let analysis = this.newAnalysis(template);
    let ast = preprocess(template.string);
    let elementCount = 0;
    let self = this;

    // Fetch the block associated with this template. If no block file for this
    // component exists, does not exist, stop.
    let block: Block | undefined = await this.resolveBlock(template);
    if (!block) { return analysis; }

    analysis.addBlock("", block);
    self.debug(`Analyzing ${componentName}. Got block for component.`);

    // Add all transitive block dependencies
    let localBlockNames: string[] = [];
    analysis.addBlock("", block);
    localBlockNames.push("<default>");
    block.eachBlockReference((name, refBlock) => {
      analysis.addBlock(name, refBlock);
      localBlockNames.push(name);
    });
    self.debug(`Analyzing ${componentName}. ${localBlockNames.length} blocks in scope: ${localBlockNames.join(", ")}.`);

    let elementAnalyzer = new ElementAnalyzer(analysis, this.options);
    traverse(ast, {
      ElementNode(node) {
        elementCount++;
        let atRootElement = (elementCount === 1);
        let element = elementAnalyzer.analyze(node, atRootElement);
        if (self.debug.enabled) self.debug("Element analyzed:", element.forOptimizer(self.options).toString());
      },
    });
    return analysis;
  }
}
