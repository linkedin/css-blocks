import { StyleMapping as OptimizedMapping, TemplateTypes } from "@opticss/template-api";

import { Block, Style } from "../Block";
import { OptionsReader } from "../OptionsReader";
import { TemplateAnalysis } from "../TemplateAnalysis";
import { ElementAnalysis } from "../TemplateAnalysis/ElementAnalysis";

import {
  IndexedClassRewrite,
} from "./ClassRewrite";
import { IndexedClassMapping, RewriteMapping } from "./RewriteMapping";
export class StyleMapping {
  /** The analyses that were used to create this mapping. */
  analyses: Array<TemplateAnalysis<keyof TemplateTypes>> | undefined;
  /** The blocks that were used to create this mapping. */
  blocks: Set<Block>;
  private options: OptionsReader;
  private optimizedMap: OptimizedMapping;

  constructor(optimizedMap: OptimizedMapping, blocks: Iterable<Block>, options: OptionsReader, analyses?: Array<TemplateAnalysis<keyof TemplateTypes>>) {
    this.options = options;
    this.optimizedMap = optimizedMap;
    this.blocks = new Set(blocks);
    this.analyses = analyses;
  }

  simpleRewriteMapping<B, S, T>(element: ElementAnalysis<B, S, T>): IndexedClassRewrite<Style> {
    let [optimizedElementInfo, classMap] = element.forOptimizer(this.options);
    let classRewrite = this.optimizedMap.rewriteMapping(optimizedElementInfo);
    return IndexedClassMapping.fromOptimizer(classRewrite, classMap);
  }

  rewriteMapping<B, S, T>(element: ElementAnalysis<B, S, T>): RewriteMapping {
    let [optimizedElementInfo, classMap] = element.forOptimizer(this.options);
    let classRewrite = this.optimizedMap.rewriteMapping(optimizedElementInfo);
    return RewriteMapping.fromOptimizer(classRewrite, classMap);
  }
}
