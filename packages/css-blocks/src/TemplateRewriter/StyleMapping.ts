import { StyleMapping as OptimizedMapping, TemplateTypes } from "@opticss/template-api";

import { Block, Style } from "../Block";
import { TemplateAnalysis } from "../TemplateAnalysis";
import { ElementAnalysis } from "../TemplateAnalysis/ElementAnalysis";
import { ResolvedConfiguration } from "../configuration";

import { IndexedClassRewrite } from "./ClassRewrite";
import { IndexedClassMapping, RewriteMapping } from "./RewriteMapping";
export class StyleMapping {
  /** The analyses that were used to create this mapping. */
  analyses: Array<TemplateAnalysis<keyof TemplateTypes>> | undefined;
  /** The blocks that were used to create this mapping. */
  blocks: Set<Block>;
  private configuration: ResolvedConfiguration;
  private optimizedMap: OptimizedMapping;

  constructor(
    optimizedMap: OptimizedMapping,
    blocks: Iterable<Block>,
    configuration: ResolvedConfiguration,
    analyses?: Array<TemplateAnalysis<keyof TemplateTypes>>,
  ) {
    this.configuration = configuration;
    this.optimizedMap = optimizedMap;
    this.blocks = new Set(blocks);
    this.analyses = analyses;
  }

  simpleRewriteMapping<B, S, T>(element: ElementAnalysis<B, S, T>): IndexedClassRewrite<Style> {
    let [optimizedElementInfo, classMap] = element.forOptimizer(this.configuration);
    let classRewrite = this.optimizedMap.rewriteMapping(optimizedElementInfo);
    return IndexedClassMapping.fromOptimizer(classRewrite, classMap);
  }

  rewriteMapping<B, S, T>(element: ElementAnalysis<B, S, T>): RewriteMapping {
    let [optimizedElementInfo, classMap] = element.forOptimizer(this.configuration);
    let classRewrite = this.optimizedMap.rewriteMapping(optimizedElementInfo);
    return RewriteMapping.fromOptimizer(classRewrite, classMap);
  }
}
