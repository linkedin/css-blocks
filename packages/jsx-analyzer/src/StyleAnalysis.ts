
// TODO: Move this file to `@css-blocks/css-blocks` npm package.

import * as path from "path";
import { Block, BlockObject } from "css-blocks";
import { ResolvedFile } from "./index";

export interface BlockPathReferences {
  [localName: string]: string
}

export interface BlockReferences {
  [localName: string]: Block
}
export type BlockObjectCorrelation = Set<BlockObject>;

export interface SerializedAnalysis {
  template: string | undefined;
  blocks: BlockPathReferences;
  stylesFound: string[];
   // The numbers stored in each correlation are an index into a stylesFound;
  styleCorrelations: number[][];
}

export default class StyleAnalysis {
  apiName: string | undefined;
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
  getBlockName(block: Block): string | null {
    let names = Object.keys(this.blocks);
    for (let i = 0; i < names.length; i++) {
      if (this.blocks[names[i]] === block) {
        return names[i];
      }
    }
    return null;
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
  serializedName(o: BlockObject) {
    return `${this.getBlockName(o.block) || ''}${o.asSource()}`;
  }
  serialize(pathsRelativeTo: string): SerializedAnalysis {
    let blockRefs: BlockPathReferences = {};
    let styles: string[] =  [];
    Object.keys(this.blocks).forEach((localname) => {
      blockRefs[localname] = path.relative(pathsRelativeTo, this.blocks[localname].source);
    });
    this.stylesFound.forEach((s) => {
      styles.push(this.serializedName(s));
    });
    styles.sort();

    let correlations: number[][] = [];
    this.styleCorrelations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          cc.push(styles.indexOf(this.serializedName(c)));
        });
        cc.sort();
        correlations.push(cc);
      }
    });
    return {
      template: path.relative(pathsRelativeTo, this.template.path || ''),
      blocks: blockRefs,
      stylesFound: styles,
      styleCorrelations: correlations
    };
  }
}
