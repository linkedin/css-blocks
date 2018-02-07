import { ElementAnalysis } from "../ElementAnalysis";
import { StyleAnalysis } from "../StyleAnalysis";

export type ErrorCallback = (str: string) => void;
export type Validator = (analysis: ElementAnalysis<any, any, any>, templateAnalysis: StyleAnalysis, err: ErrorCallback) => void;
