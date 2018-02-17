import {
  ASTPluginBuilder,
  ASTPluginEnvironment,
} from "@glimmer/syntax";
import {
  isTemplateType,
} from "@opticss/template-api";
import {
  Block,
  PluginOptionsReader as CssBlocksOptionsReader,
  StyleMapping,
  TemplateAnalysis,
} from "css-blocks";
import * as debugGenerator from "debug";

import { ResolvedFile } from "./GlimmerProject";
import { Rewriter } from "./Rewriter";

const debug = debugGenerator("css-blocks:glimmer");

interface MappingAndAnalysis {
  mapping: StyleMapping;
  analysis: TemplateAnalysis<"GlimmerTemplates.ResolvedFile">;
}

type LoaderContext = {
  dependency(dep: string): void;
};

function trackBlockDependencies(loaderContext: LoaderContext, blocks: Set<Block>, options: CssBlocksOptionsReader) {
  for (let block of blocks) {
    let sourceFile = options.importer.filesystemPath(block.identifier, options);
    if (sourceFile !== null) {
      loaderContext.dependency(sourceFile);
    }
  }
}

// tslint:disable-next-line:prefer-whatever-to-any
export function loaderAdapter(this: any, loaderContext: any): Promise<ASTPluginBuilder> {
  debug(`loader adapter for:`, loaderContext.resourcePath);
  let cssFileNames = Object.keys(loaderContext.cssBlocks.mappings);
  let options = new CssBlocksOptionsReader(loaderContext.cssBlocks.compilationOptions);
  let mappingPromises = new Array<Promise<StyleMapping | void>>();
  cssFileNames.forEach(filename => {
    mappingPromises.push(loaderContext.cssBlocks.mappings[filename]);
  });

  // Wait for all mapping promises to finish.
  return Promise.all(mappingPromises)

  // Once done, find mapping for this template, and add this plugin as a dependency.
  .then((styleMappings: Array<StyleMapping | void>): MappingAndAnalysis | undefined => {
    for (let mapping of styleMappings) {
      if (!mapping) continue; // there was an error for that one.
      if (!mapping.analyses) continue; // the mapping wasn't analyzed. (doesn't happen in this integration)

      let analysis = mapping.analyses.find(a => {
        if (isTemplateType("GlimmerTemplates.ResolvedFile", a.template)) {
          let t = <ResolvedFile>a.template;
          if (t.fullPath === loaderContext.resourcePath) {
            return true;
          }
        }
        return false;
      });
      if (analysis) {
        let a = <TemplateAnalysis<"GlimmerTemplates.ResolvedFile">>analysis;
        trackBlockDependencies(loaderContext, a.transitiveBlockDependencies(), options);
        return {
          mapping,
          analysis: a,
        };
      }
    }
    return undefined;
  })

  // Now that we have this template's block mapping, rewrite it.
  .then((mappingAndAnalysis): ASTPluginBuilder => {
    let astPlugin: ASTPluginBuilder;

    if (mappingAndAnalysis) {
        astPlugin = (env: ASTPluginEnvironment) => {
          let rewriter = new Rewriter(env.syntax, mappingAndAnalysis.mapping, mappingAndAnalysis.analysis, loaderContext.cssBlocks.compilationOptions);
          return {
            name: "css-blocks",
            visitor: {
              ElementNode(node) {
                rewriter.ElementNode(node);
              },
            },
          };
        };
    } else {
      astPlugin = (_env: ASTPluginEnvironment) => {
        return {
          name: "css-blocks-noop",
          visitor: {},
        };
      };
    }
    return astPlugin;
  });

}
