import { StyleAnalysis } from "../StyleAnalysis";
import { ElementAnalysis } from "../ElementAnalysis";

export type ErrorCallback = (str: string) => void;
export type Validator = (analysis: ElementAnalysis<any, any, any>, templateAnalysis: StyleAnalysis, err: ErrorCallback) => void;
