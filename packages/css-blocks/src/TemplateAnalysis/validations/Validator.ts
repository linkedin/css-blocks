import { StyleAnalysis } from "../StyleAnalysis";
import { ElementAnalysis } from "../ElementAnalysis";

export type ErrorCallback = (str: string, loc?: null, details?: string) => void;
export type Validator = (analysis: ElementAnalysis<any, any, any>, templateAnalysis: StyleAnalysis, err: ErrorCallback) => void;
