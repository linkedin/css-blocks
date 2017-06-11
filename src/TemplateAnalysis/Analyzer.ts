import { StyleAnalysis }  from "./StyleAnalysis";
export interface Analyzer {
  /* Analyze template(s) and return a style analysis asynchronously. */
  analyze(): Promise<StyleAnalysis>;
  /* Files may have changed. clear/invalidate any cache to prepare for a new call to analyze. */
  reset(): void;
}