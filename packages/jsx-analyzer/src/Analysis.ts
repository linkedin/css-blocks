import { TemplateAnalysis, Block, BlockObject } from 'css-blocks';

/**
 * Extension of the default css-bocks analytics object to store local block names.
 */
export default class Analysis extends TemplateAnalysis {
  localBlocks: { [localName: string]: Block } = {};
  localStates: { [localState: string]: string} = {};

  addStyle(block: BlockObject, isDynamic=false): this {
    super.addStyle(block);
    if ( isDynamic ) {
      this.markDynamic(block);
    }
    return this;
  }
}
