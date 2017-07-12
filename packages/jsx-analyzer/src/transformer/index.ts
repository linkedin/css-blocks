import { TemplateRewriter, StyleMapping } from 'css-blocks';
import { NodePath } from 'babel-traverse';
import { Program } from 'babel-types';
import { Template } from '../utils/Analysis';

export interface RewriterOptions {
  meta: { [metaprop:string]: any };
  cssBlocks: {
    styleMapping: StyleMapping<Template> | null;
  };
}

export interface RewriterOutput {
  source: string;
  map: any;
}

export default class CSSBlocksJSXTransformer implements TemplateRewriter {

  private styleMapping: StyleMapping<Template> | null;

  constructor(opts: RewriterOptions) {
    this.styleMapping = opts.cssBlocks.styleMapping;
  }

  transform(): any {
      return {
        visitor: {
          Program(path: NodePath<Program>, state: any){
            console.log('state', state.opts);
          }
      }
    };
  }
}
