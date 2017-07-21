import { TemplateRewriter, StyleMapping, PluginOptions } from 'css-blocks';
import { Template } from '../utils/Analysis';

export interface RewriterOptions {
  meta?: { [metaprop: string]: any };
  cssBlocks: {
    styleMapping: StyleMapping<Template> | null;
    compilationOptions: PluginOptions;
  };
}

export interface RewriterOutput {
  source: string;
  map: any;
}

// TODO: The entire point of this class is to serve as a transport mechanism for
//       our StyleMapping across the Webpack/Typescript/Babel barrier. This will
//       be replaced by searalizing the Mapping to JSON in the loader, appending
//       it in a comment sourcemaps style to the file, and hydrating/removing it
//       in the transformer. Remove this when that is added.
export default class CSSBlocksJSXTransformer implements TemplateRewriter {

  private styleMapping: StyleMapping<Template> | null;

  constructor(opts: RewriterOptions) {
    this.styleMapping = opts.cssBlocks.styleMapping;
  }

}
