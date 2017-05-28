import { Block, BlockObject } from "css-blocks";
import { ResolvedFile } from "./project";

export interface BlockPathReferences {
  [localName: string]: string
}

export interface BlockReferences {
  [localName: string]: Block
}
export type BlockObjectCorrelation = Set<BlockObject>;

export interface SerializedAnalysis {
  template: string;
  blocks: BlockPathReferences;
  stylesFound: string[];
   // The numbers stored in each correlation are an index into a stylesFound;
  styleCorrelations: number[][];
}

export default class StyleAnalysis {
  template: ResolvedFile;
  blocks: BlockReferences;
  stylesFound: Set<BlockObject>;
  styleCorrelations: BlockObjectCorrelation[];
  currentCorrelation: BlockObjectCorrelation | undefined;
  constructor(template: ResolvedFile) {
    this.template = template;
    this.blocks = {};
    this.stylesFound = new Set();
    this.styleCorrelations = [];
  }
  addStyle(obj: BlockObject): StyleAnalysis {
    this.stylesFound.add(obj);
    if (!this.currentCorrelation) {
      this.currentCorrelation = new Set();
    }
    this.currentCorrelation.add(obj);
    return this;
  }
  startElement(): StyleAnalysis {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      throw new Error("endElement wasn't called after a previous call to startElement");
    }
    this.currentCorrelation = undefined;
    return this;
  }
  endElement(): StyleAnalysis {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      this.styleCorrelations.push(this.currentCorrelation);
      this.currentCorrelation = undefined;
    }
    return this;
  }
  serialize(): SerializedAnalysis {
    let blockRefs: BlockPathReferences = {};
    let objects: BlockObject[];
    let styles: string[] =  [];
    Object.keys(this.blocks).forEach((localname) => {
      blockRefs[localname] = this.blocks[localname].source;
    });
    this.stylesFound.forEach((s) => {
      styles.push(s.asSource());
    });
    styles.sort();

    let correlations: number[][] = [];
    this.styleCorrelations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          cc.push(styles.indexOf(c.asSource()));
        });
        cc.sort();
        correlations.push(cc);
      }
    });
    return {
      template: this.template.path,
      blocks: blockRefs,
      stylesFound: styles,
      styleCorrelations: correlations
    };
  }
}