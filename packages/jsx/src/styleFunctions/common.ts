import { ObjectDictionary, } from '@opticss/util';
import { Block } from 'css-blocks';
import { CallExpression, } from 'babel-types';
import { JSXElementAnalysis } from '../analyzer/types';

export type StyleFunctionAnalyzer<StyleFunctionType> = (
  blocks: ObjectDictionary<Block>,
  element: JSXElementAnalysis,
  filename: string,
  styleFn: StyleFunctionType,
  func: CallExpression
) => void;