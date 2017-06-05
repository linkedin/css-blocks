import StyleAnalysis from '../StyleAnalysis';

const API_PACKAGE_NAME = 'css-blocks'; // TODO: Update with final NPM package name.

export default function closure(analysis: StyleAnalysis){
  return function ImportDeclaration(ast: any, parent: any){ // TODO: Types shouldn't be `any`

    // Fetch the import name and path.
    let name = ast.node.specifiers[0].local.name;
    let filepath = ast.node.source.value;

    // If importing CSS Blocks API, save reference to imported name.
    if ( filepath === API_PACKAGE_NAME ){
      analysis.apiName = name;
    }
  }
}
