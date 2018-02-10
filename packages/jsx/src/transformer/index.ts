import { whatever } from '@opticss/util';
import { CssBlockOptionsReadonly, PluginOptions, PluginOptionsReader, StyleMapping } from 'css-blocks';

export interface RewriterOptions {
  meta?: { [metaProp: string]: whatever };
  cssBlocks: {
    styleMapping: StyleMapping | null;
    compilationOptions: PluginOptions;
  };
}

// TODO: The entire point of this class is to serve as a transport mechanism for
//       our StyleMapping across the Webpack/Typescript/Babel barrier. This will
//       be replaced by serializing the Mapping to JSON in the loader, appending
//       it in a comment sourcemaps style to the file, and hydrating/removing it
//       in the transformer. Remove this when that is added.
export class CSSBlocksJSXTransformer {

  styleMapping: StyleMapping | null;
  cssBlockOptions: CssBlockOptionsReadonly;
  blocks: { [path: string]: StyleMapping } = {};

  constructor(opts?: RewriterOptions) {
    this.cssBlockOptions = new PluginOptionsReader(opts && opts.cssBlocks && opts.cssBlocks.compilationOptions);
    this.styleMapping = opts && opts.cssBlocks && opts.cssBlocks.styleMapping || null;
  }

}
