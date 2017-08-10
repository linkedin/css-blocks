import { TemplateAnalysis, TemplateInfo }  from "./index";
import { MetaTemplateAnalysis }  from "./MetaAnalysis";
import { BlockFactory } from "../Block/BlockFactory";

export interface AnalyzerBase {
  /** Access the block factory that this analyzer is using to load blocks. */
  readonly blockFactory: BlockFactory;

  /** Files may have changed. clear/invalidate any cache to prepare for a new call to analyze. */
  reset(): void;
}
export interface Analyzer<Template extends TemplateInfo> extends AnalyzerBase {
  /** Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<TemplateAnalysis<Template>>;
}
export interface MultiTemplateAnalyzer<Template extends TemplateInfo> extends AnalyzerBase {
  /** Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<MetaTemplateAnalysis<Template>>;
}