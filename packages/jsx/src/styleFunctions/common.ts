import { ObjectDictionary } from "@opticss/util";
import { CallExpression } from "babel-types";
import { Block } from "css-blocks";

import { JSXElementAnalysis } from "../Analyzer/types";

export type StyleFunctionAnalyzer<StyleFunctionType> = (
  blocks: ObjectDictionary<Block>,
  element: JSXElementAnalysis,
  filename: string,
  styleFn: StyleFunctionType,
  func: CallExpression,
) => void;
