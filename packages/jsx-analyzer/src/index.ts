import fs = require('fs');
import * as babylon from 'babylon';

// TODO: Get this class from `@css-blocks/css-blocks` npm package.
// import StyleAnalysis from './StyleAnalysis';

export interface ResolvedFile {
  string?: string;
  path?: string;
}

export default function parse(file: ResolvedFile) {

  // If no file information provided, throw
  if ( !file.string && !file.path ) {
    throw new Error("Invalid file input to CSS Blocks JSX Analyzer");
  }

  // If no file contents provided, fetch from path.
  if ( !file.string ) {
    // TODO: If relative, resolve path to absolute path here.
    file.string = fs.readFileSync(<string>file.path, 'utf8');
  }

  let ast = babylon.parse(file.string, {
    sourceType: "module",
    plugins: [
      "jsx",
      "decorators",
      "classProperties"
    ]
  });

  console.log(ast);
}
