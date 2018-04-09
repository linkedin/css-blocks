import {
  TemplateAnalysis as OptimizationAnalysis,
  TemplateInfo,
  TemplateIntegrationOptions,
  TemplateTypes,
 } from "@opticss/template-api";
import { MultiMap, whatever } from "@opticss/util";
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

const debug = debugGenerator("css-blocks:analyzer");

const DEFAULT_FEATURES = {
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

  protected analysisMap: Map<string, Analysis<K>>;
  protected staticStyles: MultiMap<Style, Analysis<K>>;
  protected dynamicStyles: MultiMap<Style, Analysis<K>>;

  constructor (
    options?: Options,
    analysisOpts?: AnalysisOptions,
  ) {
    this.cssBlocksOptions = resolveConfiguration(options);
    this.validatorOptions = analysisOpts && analysisOpts.validations || {};
    this.optimizationOptions = analysisOpts && analysisOpts.features || DEFAULT_FEATURES;
    this.blockFactory = new BlockFactory(this.cssBlocksOptions);
    this.analysisMap = new Map();
    this.staticStyles = new MultiMap();
    this.dynamicStyles = new MultiMap();
  }

  abstract analyze(...entryPoints: string[]): Promise<Analyzer<keyof TemplateTypes>>;

  // TODO: We don't really want to burn the world here.
  // We need more targeted Analysis / BlockFactory invalidation.
  public reset(): void {
    debug(`Resetting Analyzer.`);
    this.analysisMap = new Map();
    this.staticStyles = new MultiMap();
    this.dynamicStyles = new MultiMap();
    this.blockFactory.reset();
  }

  newAnalysis(info: TemplateInfo<K>): Analysis<K> {
    let analysis = new Analysis<K>(info, this.validatorOptions, this);
    this.analysisMap.set(info.identifier, analysis);
    return analysis;
  }

  saveStaticStyle(style: Style, analysis: Analysis<K>) {
    this.staticStyles.set(style, analysis);
  }

  saveDynamicStyle(style: Style, analysis: Analysis<K>) {
    this.dynamicStyles.set(style, analysis);
  }

  getAnalysis(idx: number): Analysis<K> { return this.analyses()[idx]; }

  analysisCount(): number { return this.analysisMap.size; }

  eachAnalysis(cb: (v: Analysis<K>) => whatever) { this.analysisMap.forEach(cb); }

  analyses(): Analysis<K>[] {
    let analyses: Analysis<K>[] = [];
    this.eachAnalysis(a => analyses.push(a));
    return analyses;
  }

  styleCount(): number { return this.staticStyles.size; }

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

}
