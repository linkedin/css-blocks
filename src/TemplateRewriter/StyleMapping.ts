import { OptionsReader } from '../OptionsReader';
import { RewriteMapping } from './RewriteMapping';
import { Element } from '../TemplateAnalysis/ElementAnalysis';
import { StyleMapping as OptimizedMapping } from "@opticss/template-api";
export class StyleMapping {
  private options: OptionsReader;
  private optimizedMap: OptimizedMapping;

  constructor(optimizedMap: OptimizedMapping, options: OptionsReader) {
    this.options = options;
    this.optimizedMap = optimizedMap;
  }

  rewriteMapping(element: Element): RewriteMapping {
    let [optimizedElementInfo, classMap] = element.forOptimizer(this.options);
    let classRewrite = this.optimizedMap.rewriteMapping(optimizedElementInfo);
    return RewriteMapping.fromOptimizer(classRewrite, classMap);
  }
}