import {
  AnalysisOptions,
  Block,
  BlockFactorySync,
  CssBlockError,
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  TemplateValidatorOptions,
  resolveConfiguration,
} from "@css-blocks/core";
import { EmberAnalysis, HandlebarsTemplate, TEMPLATE_TYPE } from "@css-blocks/ember-utils";
import type { Syntax } from "@glimmer/syntax";
import { unionInto } from "@opticss/util";
import debugGenerator = require("debug");

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
  analyses: Map<string, EmberAnalysis>;
  fileLocator: FileLocator;
  blockFactory: BlockFactorySync;
  possibleStylesheetExtensions: Array<string>;
  templates: Map<string, HandlebarsTemplate>;
  templateBlocks: Map<string, Block | null>;
  debug: debugGenerator.Debugger;

  constructor(
    blockFactory: BlockFactorySync,
    fileLocator: FileLocator,
    analysisOptions: AnalysisOptions,
    cssBlocksOpts: CSSBlocksOptions,
  ) {
    this.validationOptions = analysisOptions && analysisOptions.validations || {};
    this.blockFactory = blockFactory;
    this.fileLocator = fileLocator;
    this.analysisOptions = analysisOptions;
    this.cssBlocksOpts = resolveConfiguration(cssBlocksOpts);
    let extensions = new Set(Object.keys(this.cssBlocksOpts.preprocessorsSync));
    extensions.add("css");
    this.possibleStylesheetExtensions = [...extensions];
    this.elementCount  = 0;
    this.analyses = new Map();
    this.templates = new Map();
    this.templateBlocks = new Map();
    this.debug = debugGenerator("css-blocks:AnalyzingRewriteManager");
  }

  discoverBlockForTemplate(templatePath: string): Block | null {
    let stylesheet = this.fileLocator.findStylesheetForTemplate(templatePath, this.possibleStylesheetExtensions);
    if (stylesheet === null) return null;
    return this.blockFactory.getBlock(this.fileLocator.blockIdentifier(stylesheet));
  }

  /**
   * @param templatePath relative path to template
   */
  templateAnalyzerAndRewriter(templatePath: string, syntax: Syntax): TemplateAnalyzingRewriter {
    if (this.analyses.get(templatePath)) {
      throw new CssBlockError(`Internal Error: Template at ${templatePath} was already analyzed.`);
    }
    this.debug(`Rewriter for ${templatePath}`);
    let block = this.discoverBlockForTemplate(templatePath);
    if (block) {
      this.debug(`Rewriter for ${templatePath}: Found block.`);
    } else {
      this.debug(`Rewriter for ${templatePath}: Didn't find block.`);
    }
    this.templateBlocks.set(templatePath, block);
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
    let templatePaths = this.templates.keys();
    for (let templatePath of templatePaths) {
      let block = this.templateBlocks.get(templatePath);
      let template = this.templates.get(templatePath);
      let analysis = this.analyses.get(templatePath);
      if (!block || !template || !analysis) {
        this.debug(`Skipping template ${templatePath}`);
        continue; // this template didn't change so it didn't get compiled.
      } else {
        this.debug(`Yielding template ${templatePath}`);
      }
      yield {
        template,
        analysis,
        block,
      };
    }
  }
}
