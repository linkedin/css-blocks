import { ObjectDictionary, whatever } from "@opticss/util";
import { Options as CSSBlocksOptions, resolveConfiguration as resolveBlocksConfiguration, ResolvedConfiguration as CSSBlocksConfiguration, StyleMapping } from "css-blocks";

export interface RewriterOptions {
  meta?: ObjectDictionary<whatever>;
  cssBlocks: {
    styleMapping: StyleMapping | null;
    compilationOptions: CSSBlocksOptions;
  };
}

// TODO: The entire point of this class is to serve as a transport mechanism for
//       our StyleMapping across the Webpack/Typescript/Babel barrier. This will
//       be replaced by serializing the Mapping to JSON in the loader, appending
//       it in a comment sourcemaps style to the file, and hydrating/removing it
//       in the transformer. Remove this when that is added.
export class CSSBlocksJSXTransformer {

  styleMapping: StyleMapping | null;
  cssBlockOptions: CSSBlocksConfiguration;
  blocks: ObjectDictionary<StyleMapping> = {};

  constructor(opts?: RewriterOptions) {
    this.cssBlockOptions = resolveBlocksConfiguration(opts && opts.cssBlocks && opts.cssBlocks.compilationOptions);
    this.styleMapping = opts && opts.cssBlocks && opts.cssBlocks.styleMapping || null;
  }

}
