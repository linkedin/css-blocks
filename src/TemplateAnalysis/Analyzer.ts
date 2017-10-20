import { TemplateAnalysis }  from "./index";
import {
  TemplateTypes
} from "@opticss/template-api";
import { MetaTemplateAnalysis }  from "./MetaAnalysis";
import { BlockFactory } from "../Block/BlockFactory";

export interface AnalyzerBase {
  /** Access the block factory that this analyzer is using to load blocks. */
  readonly blockFactory: BlockFactory;

  /** Files may have changed. clear/invalidate any cache to prepare for a new call to analyze. */
  reset(): void;
}
export interface Analyzer<K extends keyof TemplateTypes> extends AnalyzerBase {
  /** Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<TemplateAnalysis<K>>;
}
export interface MultiTemplateAnalyzer extends AnalyzerBase {
  /** Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<MetaTemplateAnalysis>;
}