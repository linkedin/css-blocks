import { MetaStyleMapping, StyleMapping } from 'css-blocks';
import { Template } from '../utils/Analysis';

const loaderUtils = require('loader-utils');

export default function CSSBlocksWebpackAdapter(this: any, source: any, map: any){

  let callback = this.async();
  let thisLoader = this.loaders[this.loaderIndex];
  let path = this.resourcePath;
  let options: any;

  if (thisLoader.options) {
    options = thisLoader.options;
  } else {
    options = loaderUtils.getOptions(this);
  }

  let rewriter = options.rewriter;
  rewriter.blocks = (rewriter.blocks || {});

  if (!~path.indexOf('.tsx') && !~path.indexOf('.jsx')) {
    return callback(null, source, map);
  }

  let cssFileNames = Object.keys(this.cssBlocks.mappings);
  let metaMappingPromises = new Array<Promise<MetaStyleMapping<Template>>>();
  cssFileNames.forEach(filename => {
    metaMappingPromises.push(this.cssBlocks.mappings[filename]);
  });

  return Promise.all(metaMappingPromises).then((mappings: MetaStyleMapping<Template>[]) => {
    mappings.forEach((mapping: MetaStyleMapping<Template>) => {
      let styleMapping: StyleMapping<Template> | undefined = mapping.templates.get(path);
      if ( !styleMapping ) {
        return;
      }
      for ( let key in styleMapping.blocks ) {
        this.dependency(styleMapping.blocks[key].source);
      }
      rewriter.blocks[path] = styleMapping;
    });

    callback(null, source, map);
  });

}
