import { ObjectDictionary, whatever } from "@opticss/util";
import {
  Options as CSSBlocksOptions,
  ResolvedConfiguration as CSSBlocksConfiguration,
  StyleMapping,
  resolveConfiguration as resolveBlocksConfiguration,
} from "css-blocks";

import { TEMPLATE_TYPE } from "../Analyzer/Template";

export interface RewriterOptions {
  meta?: ObjectDictionary<whatever>;
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
  cssBlockOptions: CSSBlocksConfiguration;
  blocks: ObjectDictionary<StyleMapping<TEMPLATE_TYPE>> = {};

  constructor(opts?: RewriterOptions) {
    this.cssBlockOptions = resolveBlocksConfiguration(opts && opts.cssBlocks && opts.cssBlocks.compilationOptions);
    this.styleMapping = opts && opts.cssBlocks && opts.cssBlocks.styleMapping || null;
  }

}
