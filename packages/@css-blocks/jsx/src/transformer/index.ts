import {
  Options as CSSBlocksOptions,
  ResolvedConfiguration,
  StyleMapping,
  resolveConfiguration,
} from "@css-blocks/core";
import { ObjectDictionary } from "@opticss/util";

import { TEMPLATE_TYPE } from "../Analyzer/Template";

export interface RewriterOptions {
  meta?: ObjectDictionary<unknown>;
  cssBlocks: {
    styleMapping: StyleMapping<TEMPLATE_TYPE> | null;
    compilationOptions: CSSBlocksOptions;
  };
}

// TODO: The entire point of this class is to serve as a transport mechanism for
//       our StyleMapping across the Webpack/Typescript/Babel barrier. This will
//       be replaced by serializing the Mapping to JSON in the loader, appending
//       it in a comment sourcemaps style to the file, and hydrating/removing it
//       in the transformer. Remove this when that is added.
export class CSSBlocksJSXTransformer {

  styleMapping: StyleMapping<TEMPLATE_TYPE> | null;
  cssBlockOptions: ResolvedConfiguration;
  blocks: ObjectDictionary<StyleMapping<TEMPLATE_TYPE>> = {};

  constructor(opts?: RewriterOptions) {
    this.cssBlockOptions = resolveConfiguration(opts && opts.cssBlocks && opts.cssBlocks.compilationOptions);
    this.styleMapping = opts && opts.cssBlocks && opts.cssBlocks.styleMapping || null;
  }

}
