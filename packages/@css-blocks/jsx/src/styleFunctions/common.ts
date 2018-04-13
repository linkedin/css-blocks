import { CallExpression } from "babel-types";

import { JSXAnalysis } from "../Analyzer";
import { JSXElementAnalysis } from "../Analyzer/types";

export type StyleFunctionAnalyzer<StyleFunctionType> = (
  analyzer: JSXAnalysis,
  element: JSXElementAnalysis,
  filename: string,
  styleFn: StyleFunctionType,
  func: CallExpression,
) => void;
