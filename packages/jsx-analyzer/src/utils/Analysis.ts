import { TemplateAnalysis,
         Block,
         BlockObject,
         TemplateInfo,
         MetaTemplateAnalysis,
         TemplateInfoFactory,
         SerializedTemplateInfo,
         TemplateInfoConstructor
       } from 'css-blocks';
import { File } from 'babel-types';

export class Template extends TemplateInfo {

  static typeName = 'CssBlocks.JSXTemplateInfo';
  localStates: { [blockName: string]: string } = {};
  data: string;
  ast: File;

  constructor(identifier: string, data: string) {
    super(identifier);
    this.data = data;
  }

  static deserialize(identifier: string, ..._data: any[]): TemplateInfo {
    return new Template(identifier, _data[0]);
  }

  serialize(): SerializedTemplateInfo {
    return {
      type: Template.typeName,
      identifier: this.identifier,
      data: [ this.data ]
    };
  }
}

TemplateInfoFactory.register(TemplateInfo.typeName, Template as TemplateInfoConstructor);

/**
* Extension of the default css-bocks analytics object to store blocks and other
* files discovered in the dependency tree.
*/
export default class Analysis extends TemplateAnalysis<Template> {

  template: Template;
  parent: MetaAnalysis;
  blockPromises: Promise<Block>[] = [];

  constructor(template: Template, parent: MetaAnalysis){
    super(template);
    this.parent = parent;
  }

  addStyle(block: BlockObject, isDynamic=false): this {
    if (!block) {
      return this;
    }
    super.addStyle(block);
    if ( isDynamic ) {
      this.markDynamic(block);
    }
    return this;
  }
}

/**
 * Container for file specific state for any file discovered in the dependency tree.
 */
export class MetaAnalysis extends MetaTemplateAnalysis<Template> {

  files: Template[] = [];
  analysisPromises: Promise<Analysis>[] = [];
  blockPromises: { [path: string]: Promise<Block> } = {};

  fileCount(): number {
    return this.analyses.length;
  }

  blockCount(): number {
    let blocks: Set<Block> = new Set();
    this.eachAnalysis((analysis: TemplateAnalysis<Template>) => {
      let keys = Object.keys(analysis.blocks);
      keys.forEach((key) => {
        blocks.add(analysis.blocks[key]);
      });
    });
    return blocks.size;
  }

  blockPromisesCount(): number {
    return Object.keys(this.blockPromises).length;
  }

  getAnalysis(idx: number): Analysis {
    return this.analyses[idx] as Analysis;
  }

  getStyles(): Map<BlockObject, Analysis[]> {
    return this.stylesFound as Map<BlockObject, Analysis[]>;
  }

  getDynamicStyles(): Map<BlockObject, Analysis[]> {
    return this.dynamicStyles as Map<BlockObject, Analysis[]>;
  }
}
