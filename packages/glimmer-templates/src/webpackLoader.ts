import * as debugGenerator from "debug";
import {
  ASTPlugin,
  ASTPluginEnvironment,
  ASTPluginBuilder
} from "@glimmer/syntax";
import {
  Block,
  PluginOptionsReader as CssBlocksOptionsReader,
  MetaStyleMapping,
  StyleMapping
} from "css-blocks";

import { ResolvedFile } from "./GlimmerProject";
import { Rewriter } from "./Rewriter";

const debug = debugGenerator("css-blocks:glimmer");

interface MappingAndBlock {
  mapping: StyleMapping<ResolvedFile>;
  block: Block;
}

type LoaderContext = {
  dependency(dep: string): void;
};

function trackBlockDependencies(loaderContext: LoaderContext, block: Block, options: CssBlocksOptionsReader) {
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

export function loaderAdapter(this: any, loaderContext: any): Promise<ASTPluginBuilder> {
  debug(`loader adapter for:`, loaderContext.resourcePath);
  let cssFileNames = Object.keys(loaderContext.cssBlocks.mappings);
  let options = new CssBlocksOptionsReader(loaderContext.cssBlocks.compilationOptions);
  let metaMappingPromises = new Array<Promise<MetaStyleMapping<ResolvedFile>>>();
  cssFileNames.forEach(filename => {
    metaMappingPromises.push(loaderContext.cssBlocks.mappings[filename]);
  });

  // Wait for all mapping promises to finish.
  return Promise.all(metaMappingPromises)

  // Once done, find mapping for this template, and add this plugin as a dependency.
  .then( (metaMappings: MetaStyleMapping<ResolvedFile>[]): MappingAndBlock | undefined => {
    let mappingAndBlock: MappingAndBlock | undefined = undefined;

    metaMappings.forEach(metaMapping => {

      debug("Templates with StyleMappings:", ...metaMapping.templates.keys());
      let mapping: StyleMapping<ResolvedFile> | undefined;

      // Discover this template's mapping
      metaMapping.templates.forEach(aMapping => {
        if (aMapping && aMapping.template.fullPath === loaderContext.resourcePath) {
          debug("Found mapping.");
          mapping = aMapping;
        }
      });

      // If mapping found, track dependencies so rebuilds work.
      if (mapping) {
        if (mappingAndBlock) {
          throw Error("Multiple css blocks outputs use this template and I don't know how to handle that yet.");
        }
        let blockNames = Object.keys(mapping.blocks);
        blockNames.forEach(n => {
          let block = (<StyleMapping<ResolvedFile>>mapping).blocks[n];
          if (n === "" && mapping && block) {
            mappingAndBlock = {
              block,
              mapping
            };
          }
          trackBlockDependencies(loaderContext, block, options);
        });
      }
    });
    return mappingAndBlock;
  })

  // Now that we have this template's block mapping, rewrite it.
  .then( (mappingAndBlock): ASTPluginBuilder => {
    let astPlugin: ASTPluginBuilder;

    if (mappingAndBlock) {
        astPlugin = (env: ASTPluginEnvironment) => {
          let rewriter = new Rewriter(env.syntax, mappingAndBlock.mapping, mappingAndBlock.block, loaderContext.cssBlocks.compilationOptions);
          return {
            name: "css-blocks",
            visitor: {
              ElementNode(node) {
                rewriter.ElementNode(node);
              }
            }
          };
        };
    } else {
      astPlugin = (_env: ASTPluginEnvironment) => {
        return {
          name: "css-blocks-noop",
          visitor: {}
        };
      };
    }
    return astPlugin;
  });

}
