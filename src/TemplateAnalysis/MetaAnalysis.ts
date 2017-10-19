import * as debugGenerator from "debug";

import { Block, BlockObject } from "../Block";
import { TemplateAnalysis, SerializedTemplateAnalysis } from "./index";
import {
  TemplateInfo,
  TemplateTypes,
} from "@opticss/template-api";
import { StyleAnalysis } from "./StyleAnalysis";

let debug = debugGenerator("css-blocks");

export class SerializedMetaTemplateAnalysis {
  analyses: SerializedTemplateAnalysis<keyof TemplateTypes>[];
}

export class MetaTemplateAnalysis<Template extends TemplateInfo<keyof TemplateTypes>> implements StyleAnalysis {
  protected analyses: TemplateAnalysis<Template>[];
  protected stylesFound: Map<BlockObject, TemplateAnalysis<Template>[]>;
  protected dynamicStyles: Map<BlockObject, TemplateAnalysis<Template>[]>;

  constructor() {
    this.analyses = [];
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
  }

  addAllAnalyses(analyses: TemplateAnalysis<Template>[]) {
    analyses.forEach((analysis) => {
      this.addAnalysis(analysis);
    });
  }

  addAnalysis(analysis: TemplateAnalysis<Template>) {
    debug(`MetaAnalysis: Adding analysis for ${analysis.template.identifier}`);
    this.analyses.push(analysis);
    analysis.stylesFound.forEach((style) => {
      this.addAnalysisToStyleMap(this.stylesFound, style, analysis);
    });
    analysis.dynamicStyles.forEach((style) => {
      this.addAnalysisToStyleMap(this.dynamicStyles, style, analysis);
    });
  }

  analysisCount(): number {
    return Object.keys(this.analyses).length;
  }

  eachAnalysis(cb: (v: TemplateAnalysis<Template>) => any) {
    this.analyses.forEach(a => {
      cb(a);
    });
  }

  styleCount(): number {
    return this.stylesFound.size;
  }

  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  dynamicCount(): number {
    return this.dynamicStyles.size;
  }

  isDynamic(style: BlockObject): boolean {
    return this.dynamicStyles.has(style);
  }

  areCorrelated(...styles: BlockObject[]): boolean {
    if (styles.length < 2) return false;
    let possibleAnalyses: TemplateAnalysis<Template>[] = this.stylesFound.get(styles[0]) || [];
    for (let si = 1; si < styles.length && possibleAnalyses.length > 1; si++) {
      possibleAnalyses = possibleAnalyses.filter(a => a.stylesFound.has(styles[si]));
    }
    // TODO: Make work again.
    // for (let pai = 0; pai < possibleAnalyses.length; pai++) {
    //   let analysis = possibleAnalyses[pai];
    //   for (let ci = 0; ci < analysis.styleCorrelations.length; ci++) {
    //     let c = analysis.styleCorrelations[ci];
    //     if (styles.every(s => c.has(s))) {
    //       return true;
    //     }
    //   }
    // }
    return false;
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

  private addAnalysisToStyleMap(map: Map<BlockObject, TemplateAnalysis<Template>[]>, style: BlockObject, analysis: TemplateAnalysis<Template>) {
    let analyses = map.get(style);
    if (analyses) {
      analyses.push(analysis);
    } else {
      analyses = [analysis];
    }
    map.set(style, analyses);
  }
}
