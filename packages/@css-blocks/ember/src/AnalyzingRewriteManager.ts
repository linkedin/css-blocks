import {
  AnalysisOptions,
  Block,
  BlockFactory,
  CssBlockError,
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  TemplateValidatorOptions,
  resolveConfiguration,
} from "@css-blocks/core";
import { EmberAnalysis, HandlebarsTemplate, TEMPLATE_TYPE } from "@css-blocks/ember-support";
import { Syntax } from "@glimmer/syntax";
import { ObjectDictionary, unionInto } from "@opticss/util";

import { FileLocator } from "./FileLocator";
import { TemplateAnalyzingRewriter } from "./TemplateAnalyzingRewriter";

export type GlimmerStyleMapping = StyleMapping<TEMPLATE_TYPE>;

export interface AnalyzedTemplate {
  template: HandlebarsTemplate;
  block: Block;
  analysis: EmberAnalysis;
}

export class AnalyzingRewriteManager {
  elementCount: number;
  cssBlocksOpts: CSSBlocksConfiguration;
  validationOptions: TemplateValidatorOptions;
  analysisOptions: AnalysisOptions;
  templateBlocks: ObjectDictionary<Block | undefined>;
  analyses: Map<string, EmberAnalysis>;
  fileLocator: FileLocator;
  blockFactory: BlockFactory;
  possibleStylesheetExtensions: Array<string>;
  templates: Map<string, HandlebarsTemplate>;

  constructor(
    blockFactory: BlockFactory,
    fileLocator: FileLocator,
    analysisOptions: AnalysisOptions,
    cssBlocksOpts: CSSBlocksOptions,
  ) {
    this.validationOptions = analysisOptions && analysisOptions.validations || {};
    this.blockFactory = blockFactory;
    this.fileLocator = fileLocator;
    this.analysisOptions = analysisOptions;
    this.cssBlocksOpts = resolveConfiguration(cssBlocksOpts);
    let extensions = new Set(Object.keys(this.cssBlocksOpts.preprocessors));
    extensions.add("css");
    this.possibleStylesheetExtensions = [...extensions];
    this.elementCount  = 0;
    this.templateBlocks = {};
    this.analyses = new Map();
    this.templates = new Map();
  }

  async discoverTemplatesWithBlocks(): Promise<number> {
    let count = 0;
    for (let templatePath of this.fileLocator.possibleTemplatePaths()) {
      let stylesheet = this.fileLocator.findStylesheetForTemplate(templatePath, this.possibleStylesheetExtensions);
      if (stylesheet) {
        let block = await this.blockFactory.getBlock(this.fileLocator.blockIdentifier(stylesheet));
        this.registerTemplate(templatePath, block);
        count++;
      }
    }
    return count;
  }

  registerTemplate(template: string, block: Block) {
    this.templateBlocks[template] = block;
  }

  /**
   * @param templatePath relative path to template
   */
  templateAnalyzerAndRewriter(templatePath: string, syntax: Syntax): TemplateAnalyzingRewriter {
    if (this.analyses.get(templatePath)) {
      throw new CssBlockError(`Internal Error: Template at ${templatePath} was already analyzed.`);
    }
    let block = this.templateBlocks[templatePath];
    let template = new HandlebarsTemplate(templatePath, templatePath);
    this.templates.set(templatePath, template);
    let analysis = new EmberAnalysis(template, block, this.validationOptions);
    this.analyses.set(templatePath, analysis);
    return new TemplateAnalyzingRewriter(template, block, analysis, this.cssBlocksOpts, syntax);
  }

    /**
   * Iterates through all the analyses objects for all the templates and
   * creates a set of reservedClassNames here. These are used by the block
   * compiler to ensure the classnames that are output don't collide with user
   * specified style aliases.
   */
  reservedClassNames(): Set<string> {
    let allReservedClassNames = new Set<string>();
    for (let analysis of this.analyses.values()) {
      unionInto(allReservedClassNames, analysis.reservedClassNames());
    }
    return allReservedClassNames;
  }

  *analyzedTemplates(): Generator<AnalyzedTemplate, void> {
    let templatePaths = Object.keys(this.templateBlocks);
    for (let templatePath of templatePaths) {
      let block = this.templateBlocks[templatePath]!;
      let template = this.templates.get(templatePath);
      let analysis = this.analyses.get(templatePath);
      if (!template || !analysis) {
        continue; // this template didn't change so it didn't get compiled.
      }
      yield {
        template,
        analysis,
        block,
      };
    }
  }
}
