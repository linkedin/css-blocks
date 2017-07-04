import { TemplateAnalysis, TemplateInfo }  from "./index";
import { MetaTemplateAnalysis }  from "./MetaAnalysis";
export interface Analyzer<Template extends TemplateInfo> {
  /* Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<TemplateAnalysis<Template>>;
  /* Files may have changed. clear/invalidate any cache to prepare for a new call to analyze. */
  reset(): void;
}
export interface MultiTemplateAnalyzer<Template extends TemplateInfo> {
  /* Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<MetaTemplateAnalysis<Template>>;
  /* Files may have changed. clear/invalidate any cache to prepare for a new call to analyze. */
  reset(): void;
}