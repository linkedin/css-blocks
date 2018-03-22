import { whatever } from "@opticss/util";

import { Analysis } from "../Analysis";
import { ElementAnalysis } from "../ElementAnalysis";

export type ErrorCallback = (str: string, loc?: null, details?: string) => void;
export type Validator = (analysis: ElementAnalysis<whatever, whatever, whatever>, templateAnalysis: Analysis, err: ErrorCallback) => void;
