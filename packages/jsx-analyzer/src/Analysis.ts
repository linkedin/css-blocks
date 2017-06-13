import { TemplateAnalysis, Block } from 'css-blocks';

/**
 * Extension of the default css-bocks analytics object to store local block names.
 */
export default class Analysis extends TemplateAnalysis {
  localBlocks: { [localName: string]: Block } = {};
}
