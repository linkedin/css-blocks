import * as path from "path";

import {
  Analysis,
  AnalysisOptions,
  Analyzer,
  Block,
  BlockClass,
  BlockFactory,
  Options,
} from "@css-blocks/core";
import { ResolverConfiguration } from "@glimmer/resolver";
import { preprocess, traverse } from "@glimmer/syntax";
import { TemplateIntegrationOptions } from "@opticss/template-api";
import * as debugGenerator from "debug";
import DependencyAnalyzer from "glimmer-analyzer";
import { Template } from "glimmer-analyzer/dist/project";
import { postcss } from "opticss";

import { ElementAnalyzer } from "./ElementAnalyzer";
import { ResolvedFile } from "./GlimmerProject";

export type AttributeContainer = Block | BlockClass;
export type TEMPLATE_TYPE = "GlimmerTemplates.ResolvedFile";
export type GlimmerAnalysis = Analysis<TEMPLATE_TYPE>;

export class GlimmerAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  projectDir: string;
  srcDir: string;
  blockFactory: BlockFactory;
  moduleConfig: ResolverConfiguration;
  debug: debugGenerator.IDebugger;

  constructor(
    projectDir: string,
    moduleConfig: ResolverConfiguration,
    cssBlocksOpts?: Options,
    analysisOpts?: AnalysisOptions,
  ) {
    super(cssBlocksOpts, analysisOpts);

    this.projectDir = projectDir;
    this.blockFactory = new BlockFactory(this.cssBlocksOptions, postcss);
    this.moduleConfig = moduleConfig;
    this.srcDir = (moduleConfig.app && moduleConfig.app.mainPath) || "src";
    this.debug = debugGenerator("css-blocks:glimmer");
  }

  reset() {
    super.reset();
    this.blockFactory.reset();
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
      analyzedTagnames: true,
    };
  }

  async analyze(...templateNames: string[]): Promise<GlimmerAnalyzer> {

    let depAnalyzer = new DependencyAnalyzer(this.projectDir, {
      config: { moduleConfiguration: this.moduleConfig },
      paths: {
        src: this.srcDir,
      },
    });

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
      analysisPromises.push(this.analyzeTemplate(dep, depAnalyzer));
    });

    await Promise.all(analysisPromises);
    return this;
  }

  private async resolveBlock(componentName: string, depAnalyzer: DependencyAnalyzer): Promise<Block | undefined> {
    try {
      let identifier = depAnalyzer.project.resolver.identify(`stylesheet:${componentName}`);
      let blockPath = depAnalyzer.project.resolver.resolve(identifier);
      if (!blockPath) {
        this.debug(`Analyzing ${componentName}. No block for component. Returning empty analysis.`);
        return undefined;
      }
      // TODO: We need to automatically discover the file ending here – its not guaranteed to be a css file.
      blockPath = path.join(this.projectDir, blockPath) + ".css";
      return await this.blockFactory.getBlockFromPath(blockPath);
    } catch (e) {
      console.error(e);
      this.debug(`Analyzing ${componentName}. No block for component. Returning empty analysis.`);
      return undefined;
    }
  }

  protected async analyzeTemplate(componentName: string, depAnalyzer: DependencyAnalyzer): Promise<GlimmerAnalysis> {
    this.debug("Analyzing template: ", componentName);
    let template: Template = depAnalyzer.project.templateFor(componentName);
    let resovledFile = new ResolvedFile(template.string, template.specifier, template.path);
    let analysis = this.newAnalysis(resovledFile);
    let ast = preprocess(template.string);
    let elementCount = 0;
    let self = this;

    // Fetch the block associated with this template. If no block file for this
    // component exists, does not exist, stop.
    let block: Block | undefined = await this.resolveBlock(componentName, depAnalyzer);
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

    let elementAnalyzer = new ElementAnalyzer(analysis, this.cssBlocksOptions);
    traverse(ast, {
      ElementNode(node) {
        elementCount++;
        let atRootElement = (elementCount === 1);
        let element = elementAnalyzer.analyze(node, atRootElement);
        if (self.debug.enabled) self.debug("Element analyzed:", element.forOptimizer(self.cssBlocksOptions).toString());
      },
    });
    return analysis;
  }
}
