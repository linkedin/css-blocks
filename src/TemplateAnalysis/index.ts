import * as path from "path";
import { BlockObject } from "../Block/BlockObject";
import { Block } from "../Block/Block";

export class TemplateInfo {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
}

export interface SerializedTemplateAnalysis {
  template: string;
  blocks: {
    [localName: string]: string;
  };
  stylesFound: string[];
  dynamicStyles: number[];
   // The numbers stored in each correlation are an index into a stylesFound;
  styleCorrelations: number[][];
}

export class TemplateAnalysis {
  template: TemplateInfo;
  blocks: {
    [localName: string]: Block;
  };
  stylesFound: Set<BlockObject>;
  dynamicStyles: Set<BlockObject>;
  styleCorrelations: Set<BlockObject>[];
  currentCorrelation: Set<BlockObject> | undefined;
  constructor(template: TemplateInfo) {
    this.template = template;
    this.blocks = {};
    this.stylesFound = new Set();
    this.dynamicStyles = new Set();
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
  addStyle(obj: BlockObject): this {
    this.stylesFound.add(obj);
    if (!this.currentCorrelation) {
      this.currentCorrelation = new Set();
    }
    this.currentCorrelation.add(obj);
    return this;
  }
  markDynamic(obj: BlockObject): this {
    if (this.stylesFound.has(obj)) {
      this.dynamicStyles.add(obj);
    } else {
      throw new Error("Cannot mark style that hasn't yet been added as dynamic.");
    }
    return this;
  }
  startElement(): this {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      throw new Error("endElement wasn't called after a previous call to startElement");
    }
    this.currentCorrelation = undefined;
    return this;
  }
  endElement(): this {
    if (this.currentCorrelation && this.currentCorrelation.size > 0) {
      this.styleCorrelations.push(this.currentCorrelation);
      this.currentCorrelation = undefined;
    }
    return this;
  }
  serializedName(o: BlockObject) {
    return `${this.getBlockName(o.block) || ''}${o.asSource()}`;
  }
  serialize(pathsRelativeTo: string): SerializedTemplateAnalysis {
    let blockRefs = {};
    let styles: string[] =  [];
    let dynamicStyles: number[] = [];
    Object.keys(this.blocks).forEach((localname) => {
      blockRefs[localname] = path.relative(pathsRelativeTo, this.blocks[localname].source);
    });
    this.stylesFound.forEach((s) => {
      styles.push(this.serializedName(s));
    });
    styles.sort();

    this.dynamicStyles.forEach((dynamicStyle) => {
      dynamicStyles.push(styles.indexOf(this.serializedName(dynamicStyle)));
    });

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
      template: path.relative(pathsRelativeTo, this.template.path),
      blocks: blockRefs,
      stylesFound: styles,
      dynamicStyles: dynamicStyles,
      styleCorrelations: correlations
    };
  }
}