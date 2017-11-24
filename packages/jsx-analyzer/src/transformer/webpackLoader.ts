import { StyleMapping, PluginOptionsReader, Block } from 'css-blocks';

const loaderUtils = require('loader-utils');

type LoaderContext = {
  dependency(dep: string): void;
};

function trackBlockDependencies(loaderContext: LoaderContext, block: Block, options: PluginOptionsReader): void {
  let sourceFile = options.importer.filesystemPath(block.identifier, options);
  if (sourceFile !== null) {
    loaderContext.dependency(sourceFile);
  }
  block.dependencies.forEach(dep => {
    loaderContext.dependency(dep);
  });
  block.transitiveBlockDependencies().forEach(blockDep => {
    trackBlockDependencies(loaderContext, blockDep, options);
  });
}

export default function CSSBlocksWebpackAdapter(this: any, source: any, map: any): void {

  let callback = this.async();
  let thisLoader = this.loaders[this.loaderIndex];
  let path = this.resourcePath;
  let options: any;

  if (thisLoader.options) {
    options = thisLoader.options;
  } else {
    options = loaderUtils.getOptions(this);
  }

  let rewriter = options.getRewriter();
  rewriter.blocks = (rewriter.blocks || {});

  this.dependency(path);

  if (!~path.indexOf('.tsx') && !~path.indexOf('.jsx')) {
    return callback(null, source, map);
  }

  let cssFileNames = Object.keys(this.cssBlocks.mappings);
  let cssBlockOpts: PluginOptionsReader = new PluginOptionsReader(this.cssBlocks.compilationOptions);
  let metaMappingPromises: Promise<StyleMapping>[] = [];

  cssFileNames.forEach(filename => {
    metaMappingPromises.push(this.cssBlocks.mappings[filename]);
  });

  Promise.all(metaMappingPromises)

  .then((mappings: StyleMapping[]) => {
    mappings.forEach((mapping: StyleMapping) => {
      // When an css or analysis error happens the mapping seems to be undefined and generates a confusing error.
      let styleMapping: StyleMapping | undefined = mapping && mapping.analyses && mapping.analyses.find(a => a.template.identifier === path ) && mapping;
      if ( !styleMapping ) {
        return;
      }
      for ( let key in styleMapping.blocks ) {
        let block = styleMapping.blocks[key];
        trackBlockDependencies(this, block, cssBlockOpts);
      }
      rewriter.blocks[path] = styleMapping;
    });

    callback(null, source, map);
  })

  .catch((err) => {
    callback(err);
  });

}
