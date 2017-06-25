import { Block, BlockObject } from "../Block";
import { TemplateAnalysis, SerializedTemplateAnalysis } from "./index";
import { StyleAnalysis } from "./StyleAnalysis";

export type TemplateAnalysisMap = Map<BlockObject, TemplateAnalysis[]>;

export class SerializedMetaTemplateAnalysis {
  analyses: SerializedTemplateAnalysis[];
}

export class MetaTemplateAnalysis<Analysis extends TemplateAnalysis> implements StyleAnalysis {
  protected analyses: Analysis[];
  protected stylesFound: Map<BlockObject, Analysis[]>;
  protected dynamicStyles: Map<BlockObject, Analysis[]>;

  constructor() {
    this.analyses = [];
    this.stylesFound = new Map();
    this.dynamicStyles = new Map();
  }

  addAllAnalyses(analyses: Analysis[]) {
    analyses.forEach((analysis) => {
      this.addAnalysis(analysis);
    });
  }

  addAnalysis(analysis: Analysis) {
    this.analyses.push(analysis);
    analysis.stylesFound.forEach((style) => {
      this.addAnalysisToStyleMap(this.stylesFound, style, analysis);
    });
    analysis.dynamicStyles.forEach((style) => {
      this.addAnalysisToStyleMap(this.dynamicStyles, style, analysis);
    });
  }

  eachAnalysis(cb: (v: Analysis) => any) {
    this.analyses.forEach(a => {
      cb(a);
    });
  }

  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  isDynamic(style: BlockObject): boolean {
    return this.dynamicStyles.has(style);
  }

  areCorrelated(...styles: BlockObject[]): boolean {
    if (styles.length < 2) return false;
    let possibleAnalyses: Analysis[] = this.stylesFound.get(styles[0]) || [];
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

  serialize(pathsRelativeTo: string): SerializedMetaTemplateAnalysis {
    let analyses: SerializedTemplateAnalysis[] = [];
    this.eachAnalysis(a => {
      analyses.push(a.serialize(pathsRelativeTo));
    });
    return { analyses };
  }

  private addAnalysisToStyleMap(map: Map<BlockObject, Analysis[]>, style: BlockObject, analysis: Analysis) {
    let analyses = map.get(style);
    if (analyses) {
      analyses.push(analysis);
    } else {
      analyses = [analysis];
    }
    map.set(style, analyses);
  }
}
