import { ElementAnalysis } from "../ElementAnalysis";
import { StyleAnalysis } from "../StyleAnalysis";

export type ErrorCallback = (str: string) => void;
// tslint:disable-next-line:prefer-whatever-to-any
export type Validator = (analysis: ElementAnalysis<any, any, any>, templateAnalysis: StyleAnalysis, err: ErrorCallback) => void;
