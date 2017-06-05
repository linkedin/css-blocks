import StyleAnalysis from '../StyleAnalysis';
import CallExpression from './CallExpression';
import ImportDeclaration from './ImportDeclaration';

// Consolidate all visitors into a hash that we can pass to `babel-traverse`
export default function visitors(analysis: StyleAnalysis){
  return {
    CallExpression: CallExpression(analysis),
    ImportDeclaration: ImportDeclaration(analysis)
  };
}
