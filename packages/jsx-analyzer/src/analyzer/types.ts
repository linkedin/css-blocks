import { ElementAnalysis, } from 'css-blocks';
import { Expression, } from 'babel-types';
import { SourceLocation, } from '@opticss/template-api';

export type BooleanExpression = Expression;
export type StringExpression = Expression;
export type TernaryExpression = Expression;

export type JSXElementAnalysis = ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>;

export interface Flags {
  [flag: string]: boolean;
}

export function newJSXElementAnalysis(location: SourceLocation, tagName?: string, id?: string): JSXElementAnalysis {
  return new ElementAnalysis<BooleanExpression, StringExpression, TernaryExpression>(location, tagName, id);
}