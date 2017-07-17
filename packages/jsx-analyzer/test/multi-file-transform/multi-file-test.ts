// // import { assert } from 'chai';
// import { suite, /*test, only,*/ skip } from 'mocha-typescript';
// import { MetaAnalysis, Template } from '../../src/utils/Analysis';
// import { StyleMapping, MetaStyleMapping, PluginOptionsReader as OptionsReader } from 'css-blocks';
// import { parseFile } from '../../src/index';
// import CSSBlocksJSXTransformer from '../../src/transformer';
//
// import * as babel from 'babel-core';
// import visitors from '../../src/transformer/babel';
//
// const path = require('path');
// const fs   = require('fs');
//
// @suite('Dependnecy Tree Crawling')
// export class Test {
//
//   @skip 'All blocks are discovered in multi-file app from entrypoint'(){
//     let base = path.resolve(__dirname, '../../../test/fixtures/basic-multifile');
//     return parseFile('index.tsx', { baseDir: base }).then((analysis: MetaAnalysis) => {
//       let styleMapping: MetaStyleMapping<Template> = MetaStyleMapping.fromMetaAnalysis(analysis, new OptionsReader);
//       styleMapping.templates.forEach((mapping: StyleMapping<Template>, name: string) => {
//         // console.log(name, mapping);
//         let rewriter = new CSSBlocksJSXTransformer({ cssBlocks: { styleMapping: mapping }  });
//         console.log(babel.transform(fs.readFileSync(name), {
//           plugins: [ [ visitors, { rewriter } ] ],
//           parserOpts: {
//             sourceType: 'module',
//             plugins: [
//               'jsx',
//               'flow',
//               'decorators',
//               'classProperties',
//               'exportExtensions',
//               'asyncGenerators',
//               'functionBind',
//               'functionSent',
//               'dynamicImport'
//             ]
//           }
//         }).code);
//         console.log('----------------');
//       });
//     });
//   }
//
// }
