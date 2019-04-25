import { TemplateTypes } from "@opticss/template-api";

import { Analysis } from "../Analysis";
import { ElementAnalysis } from "../ElementAnalysis";

export type ErrorCallback = (str: string, loc?: null, details?: string) => void;
export type Validator = (analysis: ElementAnalysis<unknown, unknown, unknown>, templateAnalysis: Analysis<keyof TemplateTypes>, err: ErrorCallback) => void;
