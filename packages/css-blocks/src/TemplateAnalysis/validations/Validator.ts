import { whatever } from "@opticss/util";

import { ElementAnalysis } from "../ElementAnalysis";
import { StyleAnalysis } from "../StyleAnalysis";

export type ErrorCallback = (str: string, loc?: null, details?: string) => void;
export type Validator = (analysis: ElementAnalysis<whatever, whatever, whatever>, templateAnalysis: StyleAnalysis, err: ErrorCallback) => void;
