import {
  Block,
  normalizeOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
} from "css-blocks";
import * as debugGenerator from "debug";

const debug = debugGenerator("css-blocks:jsx");
const loaderUtils = require("loader-utils");

type LoaderContext = {
  dependency(dep: string): void;
};

function trackBlockDependencies(loaderContext: LoaderContext, block: Block, options: CSSBlocksConfiguration): void {
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

// tslint:disable-next-line:prefer-whatever-to-any
export function CSSBlocksWebpackAdapter(this: any, source: any, map: any): void {

  let callback = this.async();
  let thisLoader = this.loaders[this.loaderIndex];
  let path = this.resourcePath;
  // tslint:disable-next-line:prefer-whatever-to-any
  let options: any;

  if (thisLoader.options) {
    options = thisLoader.options;
  } else {
    options = loaderUtils.getOptions(this);
  }

  let rewriter = options.getRewriter();
  rewriter.blocks = (rewriter.blocks || {});

  this.dependency(path);

  if (!~path.indexOf(".tsx") && !~path.indexOf(".jsx")) {
    return callback(null, source, map);
  }

  let cssFileNames = Object.keys(this.cssBlocks.mappings);
  let cssBlockOpts = normalizeOptions(this.cssBlocks.compilationOptions);
  let metaMappingPromises: Promise<StyleMapping>[] = [];

  cssFileNames.forEach(filename => {
    metaMappingPromises.push(this.cssBlocks.mappings[filename]);
  });

  debug(`Waiting for ${metaMappingPromises.length} block compilations to complete...`);
  Promise.all(metaMappingPromises)

  .then((mappings: StyleMapping[]) => {
    mappings.forEach((mapping: StyleMapping) => {
      // When an css or analysis error happens the mapping seems to be undefined and generates a confusing error.
      let styleMapping: StyleMapping | undefined = mapping && mapping.analyses && mapping.analyses.find(a => a.template.identifier === path) && mapping;
      if (!styleMapping) {
        return;
      }
      for (let key in styleMapping.blocks) {
        let block = styleMapping.blocks[key];
        trackBlockDependencies(this, block, cssBlockOpts);
      }
      rewriter.blocks[path] = styleMapping;
    });

    debug(`Completed ${metaMappingPromises.length} block compilations!`);

    callback(null, source, map);
  })

  .catch((err) => {
    callback(err);
  });

}

// Webpack expects the default export of loaders to be the loader itself.
// tslint:disable-next-line:no-default-export
export default CSSBlocksWebpackAdapter;
