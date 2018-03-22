import {
  TemplateAnalysis as OptimizationAnalysis,
  TemplateInfo,
  TemplateIntegrationOptions,
  TemplateTypes,
 } from "@opticss/template-api";
import { whatever } from "@opticss/util";
import * as debugGenerator from "debug";

import { BlockFactory } from "../BlockParser";
import { Block, Style } from "../BlockTree";
import {
  Options,
  resolveConfiguration,
  ResolvedConfiguration,
} from "../configuration";

import { Analysis, SerializedAnalysis } from "./Analysis";
import { TemplateValidatorOptions } from "./validations";
import { Configuration } from "webpack";

const debug = debugGenerator("css-blocks:analyzer");

const DEFAULT_OPTS = {
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

export interface AnalysisOptions {
  validations?: TemplateValidatorOptions;
  features?: TemplateIntegrationOptions;
}

export interface SerializedAnalyzer {
  analyses: SerializedAnalysis[];
}

export abstract class Analyzer<K extends keyof TemplateTypes> {
  public readonly blockFactory: BlockFactory;

  public readonly validatorOptions: TemplateValidatorOptions;
  public readonly optimizationOptions: TemplateIntegrationOptions;
  public readonly cssBlocksOptions: ResolvedConfiguration;

  protected analysisMap: Map<string, Analysis>;
  protected stylesFound: Map<Style, Analysis[]>;
  protected dynamicStyles: Map<Style, Analysis[]>;

  constructor (
    options?: Options,
    analysisOpts?: AnalysisOptions,
  ) {
    this.cssBlocksOptions = resolveConfiguration(options);
    this.validatorOptions = analysisOpts && analysisOpts.validations || {};
    this.optimizationOptions = analysisOpts && analysisOpts.features || DEFAULT_OPTS;
    this.blockFactory = new BlockFactory(this.cssBlocksOptions);
    this.analysisMap = new Map();
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
  }

  abstract analyze(...entryPoints: string[]): Promise<Analyzer<keyof TemplateTypes>>;

  // TODO: We don't really want to burn the world here.
  // We need more targeted Analysis / BlockFactory invalidation.
  public reset(): void {
    this.analysisMap = new Map();
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
    this.blockFactory.reset();
  }

  newAnalysis(info: TemplateInfo<K>): Analysis {
    let analysis = new Analysis(info, this.validatorOptions);
    this.analysisMap.set(info.identifier, analysis);
    return analysis;
  }

  addAnalysis(analysis: Analysis) {
    debug(`MetaAnalysis: Adding analysis for ${analysis.template.identifier}`);
    this.analysisMap.set(analysis.template.identifier, analysis);
    for (let style of analysis.stylesFound()) {
      this.addAnalysisToStyleMap(this.stylesFound, style, analysis);
    }
    for (let style of analysis.stylesFound(true)) {
      this.addAnalysisToStyleMap(this.dynamicStyles, style, analysis);
    }
  }

  analysisCount(): number { return this.analysisMap.size; }

  eachAnalysis(cb: (v: Analysis) => whatever) { this.analysisMap.forEach(cb); }

  styleCount(): number { return this.stylesFound.size; }

  dynamicCount(): number { return this.dynamicStyles.size; }

  isDynamic(style: Style): boolean { return this.dynamicStyles.has(style); }

  blockDependencies(): Set<Block> {
    let allBlocks = new Set<Block>();
    this.analysisMap.forEach(analysis => {
      allBlocks = new Set([...allBlocks, ...analysis.referencedBlocks()]);
    });
    return allBlocks;
  }

  transitiveBlockDependencies(): Set<Block> {
    let allBlocks = new Set<Block>();
    this.analysisMap.forEach(analysis => {
      allBlocks = new Set<Block>([...allBlocks, ...analysis.transitiveBlockDependencies()]);
    });
    return allBlocks;
  }

  analyses(): Analysis[] {
    let analyses: Analysis[] = [];
    this.eachAnalysis(a => analyses.push(a));
    return analyses;
  }

  serialize(): SerializedAnalyzer {
    let analyses: SerializedAnalysis[] = [];
    this.eachAnalysis(a => {
      analyses.push(a.serialize());
    });
    return { analyses };
  }

  forOptimizer(opts: ResolvedConfiguration): OptimizationAnalysis<keyof TemplateTypes>[] {
    let analyses = new Array<OptimizationAnalysis<keyof TemplateTypes>>();
    this.eachAnalysis(a => {
      analyses.push(a.forOptimizer(opts));
    });
    return analyses;
  }

  private addAnalysisToStyleMap(map: Map<Style, Analysis[]>, style: Style, analysis: Analysis) {
    let analyses = map.get(style);
    if (analyses) {
      analyses.push(analysis);
    } else {
      analyses = [analysis];
    }
    map.set(style, analyses);
  }
}
