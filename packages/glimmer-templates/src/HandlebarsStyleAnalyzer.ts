import { preprocess, traverse } from '@glimmer/syntax';
import {
  Block,
  BlockClass,
  TemplateAnalysis as SingleTemplateStyleAnalysis,
  MetaTemplateAnalysis as MetaStyleAnalysis,
  TemplateAnalyzer,
  MultiTemplateAnalyzer,
  PluginOptionsReader,
  BlockFactory,
} from "css-blocks";
import Project from "./project";
import { ResolvedFile } from "./GlimmerProject";
import DependencyAnalyzer from "glimmer-analyzer";
import * as debugGenerator from 'debug';
import { ElementAnalyzer } from './ElementAnalyzer';

export type StateContainer = Block | BlockClass;

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

  protected analyzeTemplate(componentName: string): Promise<SingleTemplateStyleAnalysis<"GlimmerTemplates.ResolvedFile"> | null> {
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
      let elementAnalyzer = new ElementAnalyzer(block, template, this.options);
      analysis.blocks[""] = block;
      block.eachBlockReference((name, refBlock) => {
        analysis.blocks[name] = refBlock;
      });
      let localBlockNames = Object.keys(analysis.blocks).map(n => n === "" ? "<default>" : n);
      self.debug(`Analyzing ${componentName}. ${localBlockNames.length} blocks in scope: ${localBlockNames.join(', ')}.`);
      traverse(ast, {
        ElementNode(node) {
          elementCount++;
          let atRootElement = (elementCount === 1);
          let element = elementAnalyzer.analyze(node, atRootElement);
          analysis.addElement(element);
          if (self.debug.enabled) self.debug("Element analyzed:", element.forOptimizer(self.options).toString());
        }
      });
      return analysis;
    }).catch((error) => {
      if (/File not found for stylesheet/.test(error.message)) {
        return null;
      } else {
        throw error;
      }
    });
  }
}

export class HandlebarsStyleAnalyzer extends BaseStyleAnalyzer implements TemplateAnalyzer<"GlimmerTemplates.ResolvedFile"> {
  project: Project;
  templateName: string;

  constructor(project: Project | string, templateName: string) {
    super(project);
    this.templateName = templateName;
  }

  analyze(): Promise<SingleTemplateStyleAnalysis<"GlimmerTemplates.ResolvedFile">> {
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

export class HandlebarsTransitiveStyleAnalyzer extends BaseStyleAnalyzer implements MultiTemplateAnalyzer {
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

  analyze(): Promise<MetaStyleAnalysis> {
    let depAnalyzer = new DependencyAnalyzer(this.project.projectDir); // TODO pass module config https://github.com/tomdale/glimmer-analyzer/pull/1

    let components = new Set<string>();
    let analysisPromises: Promise<SingleTemplateStyleAnalysis<"GlimmerTemplates.ResolvedFile"> | null>[] = [];
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
      let metaAnalysis = new MetaStyleAnalysis();
      analyses.forEach(a => {
        if (a !== null) {
          metaAnalysis.addAnalysis(a);
        }
      });
      return metaAnalysis;
    });
  }
}
