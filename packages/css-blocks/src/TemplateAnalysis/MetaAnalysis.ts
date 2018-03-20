import {
  TemplateAnalysis as OptimizedTemplateAnalysis,
  TemplateIntegrationOptions,
  TemplateTypes,
} from "@opticss/template-api";
import { whatever } from "@opticss/util";
import * as debugGenerator from "debug";

import { Block, Style } from "../Block";
import { ResolvedConfiguration } from "../options";

import { StyleAnalysis } from "./StyleAnalysis";
import { SerializedTemplateAnalysis, TemplateAnalysis } from "./index";

let debug = debugGenerator("css-blocks");

export interface SerializedMetaTemplateAnalysis {
  analyses: SerializedTemplateAnalysis<keyof TemplateTypes>[];
}

export class MetaTemplateAnalysis implements StyleAnalysis {
  protected analyses: TemplateAnalysis<keyof TemplateTypes>[];
  protected stylesFound: Map<Style, TemplateAnalysis<keyof TemplateTypes>[]>;
  protected dynamicStyles: Map<Style, TemplateAnalysis<keyof TemplateTypes>[]>;

  constructor() {
    this.analyses = [];
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
  }

  optimizationOptions(): TemplateIntegrationOptions {
    // TODO: take this as an argument from the template integration.
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

  addAllAnalyses(analyses: TemplateAnalysis<keyof TemplateTypes>[]) {
    analyses.forEach((analysis) => {
      this.addAnalysis(analysis);
    });
  }

  addAnalysis(analysis: TemplateAnalysis<keyof TemplateTypes>) {
    debug(`MetaAnalysis: Adding analysis for ${analysis.template.identifier}`);
    this.analyses.push(analysis);
    for (let style of analysis.stylesFound()) {
      this.addAnalysisToStyleMap(this.stylesFound, style, analysis);
    }
    for (let style of analysis.stylesFound(true)) {
      this.addAnalysisToStyleMap(this.dynamicStyles, style, analysis);
    }
  }

  analysisCount(): number {
    return Object.keys(this.analyses).length;
  }

  eachAnalysis(cb: (v: TemplateAnalysis<keyof TemplateTypes>) => whatever) {
    this.analyses.forEach(a => {
      cb(a);
    });
  }

  styleCount(): number {
    return this.stylesFound.size;
  }

  dynamicCount(): number {
    return this.dynamicStyles.size;
  }

  isDynamic(style: Style): boolean {
    return this.dynamicStyles.has(style);
  }

  blockDependencies(): Set<Block> {
    let allBlocks = new Set<Block>();
    this.analyses.forEach(analysis => {
      allBlocks = new Set([...allBlocks, ...analysis.referencedBlocks()]);
    });
    return allBlocks;
  }

  transitiveBlockDependencies(): Set<Block> {
    let allBlocks = new Set<Block>();
    this.analyses.forEach(analysis => {
      allBlocks = new Set<Block>([...allBlocks, ...analysis.transitiveBlockDependencies()]);
    });
    return allBlocks;
  }

  serialize(): SerializedMetaTemplateAnalysis {
    let analyses: SerializedTemplateAnalysis<keyof TemplateTypes>[] = [];
    this.eachAnalysis(a => {
      analyses.push(a.serialize());
    });
    return { analyses };
  }

  forOptimizer(config: ResolvedConfiguration): Array<OptimizedTemplateAnalysis<keyof TemplateTypes>> {
    let analyses = new Array<OptimizedTemplateAnalysis<keyof TemplateTypes>>();
    this.eachAnalysis(a => {
      analyses.push(a.forOptimizer(config));
    });
    return analyses;
  }

  private addAnalysisToStyleMap(map: Map<Style, TemplateAnalysis<keyof TemplateTypes>[]>, style: Style, analysis: TemplateAnalysis< keyof TemplateTypes>) {
    let analyses = map.get(style);
    if (analyses) {
      analyses.push(analysis);
    } else {
      analyses = [analysis];
    }
    map.set(style, analyses);
  }
}
