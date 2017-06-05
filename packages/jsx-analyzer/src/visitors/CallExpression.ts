import StyleAnalysis from '../StyleAnalysis';

export default function closure(analysis: StyleAnalysis){
  return function CallExpression(ast: any, parent: any){

    // Get the name of the expression being called.
    let name = ast.node.callee.name;

    // If we haven't imported the CSS Blocks API, or if this call expression is
    // not referencing the CSS Blocks API, return.
    if ( !analysis.apiName || name !== analysis.apiName ) {
      return;
    }

    // TODO: Handle synamic style call

  }
}
