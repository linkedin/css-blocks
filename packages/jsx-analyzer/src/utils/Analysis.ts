import { TemplateAnalysis, Block, BlockObject, TemplateInfo } from 'css-blocks';
import { File } from 'babel-types';

/**
 * Container for file specific state for any file discovered in the dependency tree.
 */
export class FileContainer extends TemplateInfo {
  filename: string;
  data: string;
  ast: File;
  blocks: Block[] = [];
  blockPromises: Promise<Block>[] = [];
  localBlocks: { [localName: string]: Block } = {};
  localStates: { [localState: string]: string} = {};
  constructor(file: string, data: string){
    super(file);
    this.data = data;
  }
}

/**
 * Extension of the default css-bocks analytics object to store blocks and other
 * files discovered in the dependency tree.
 */
export default class Analysis extends TemplateAnalysis {

  files: FileContainer[] = [];
  filePromises: Promise<FileContainer>[] = [];
  blockPromises: Promise<Block>[] = [];
  blockPromisesArray: Promise<Block>[] = [];

  addStyle(block: BlockObject, isDynamic=false): this {
    super.addStyle(block);
    if ( isDynamic ) {
      this.markDynamic(block);
    }
    return this;
  }
}
