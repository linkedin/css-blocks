import { Block, BlockObject } from "../Block";
import { TemplateAnalysis } from "./index";
import { StyleAnalysis } from "./StyleAnalysis";

type TemplateAnalysisMap = Map<BlockObject, TemplateAnalysis[]>;

export class MetaTemplateAnalysis implements StyleAnalysis {
  private analyses: TemplateAnalysis[];
  private stylesFound: TemplateAnalysisMap;
  private dynamicStyles: TemplateAnalysisMap;

  constructor() {
    this.analyses = [];
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
  }

  addAllAnalyses(analyses: TemplateAnalysis[]) {
    analyses.forEach.call(this, this.addAnalysis);
  }

  addAnalysis(analysis: TemplateAnalysis) {
    this.analyses.push(analysis);
    analysis.stylesFound.forEach((style) => {
      this.addAnalysisToStyleMap(this.stylesFound, style, analysis);
    });
    analysis.dynamicStyles.forEach((style) => {
      this.addAnalysisToStyleMap(this.dynamicStyles, style, analysis);
    });
  }

  eachAnalysis(cb: (v: TemplateAnalysis) => any) {
    this.analyses.forEach.call(null, cb);
  }

  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  isDynamic(style: BlockObject): boolean {
    return this.dynamicStyles.has(style);
  }

  areCorrelated(...styles: BlockObject[]): boolean {
    if (styles.length < 2) return false;
    let possibleAnalyses: TemplateAnalysis[] = this.stylesFound.get(styles[0]) || [];
    for (let si = 1; si < styles.length && possibleAnalyses.length > 1; si++) {
      possibleAnalyses = possibleAnalyses.filter(a => a.stylesFound.has(styles[si]));
    }
    for (let pai = 0; pai < possibleAnalyses.length; pai++) {
      let analysis = possibleAnalyses[pai];
      for (let ci = 0; ci < analysis.styleCorrelations.length; ci++) {
        let c = analysis.styleCorrelations[ci];
        if (styles.every(s => c.has(s))) {
          return true;
        }
      }
    }
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

  private addAnalysisToStyleMap(map: TemplateAnalysisMap, style: BlockObject, analysis: TemplateAnalysis) {
    let analyses = map.get(style);
    if (analyses) {
      analyses.push(analysis);
    } else {
      analyses = [analysis];
    }
    map.set(style, analyses);
  }
}
