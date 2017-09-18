import {
  Block,
  BlockReferenceMap
} from "./Block";
import {
  BlockObject
} from "./BlockObject";

export abstract class LocalScope {
  abstract defaultBlock(): Block | undefined;
  abstract blockNamed(name: string): Block | undefined;

  /**
   * Lookup a sub-block either locally, or on a referenced foreign block.
   * @param reference A reference to a sub-block of the form `(<block-name>.)<sub-block-selector>`
   * @returns The BlockObject referenced at the supplied path.
   */
  lookup(reference: string): BlockObject | undefined {

    // Try to split the reference string to find block name reference. If there
    // is a block name reference, fetch the named block and run lookup in that context.
    let refMatch = reference.match(/^([-\w]+)((?:\.|\[).*)?$/);
    if (refMatch) {
      let refName = refMatch[1];
      let subObjRef = refMatch[2];
      let refBlock = this.blockNamed(refName);
      if (refBlock === undefined) {
        return undefined;
      }
      if (subObjRef !== undefined) {
        return refBlock.lookup(subObjRef);
      } else {
        return refBlock;
      }
    }

    // Otherwise, find the sub-block in the default block.
    let defaultBlock = this.defaultBlock();
    if (defaultBlock) {
      return defaultBlock.all().find((o) => o.asSource() === reference); // <-- Super ineffecient algorithm. Better to parse the string and traverse directly.
    } else {
      return undefined;
    }
  }
}

export class BlockScope extends LocalScope {
  block: Block;
  constructor(block: Block) {
    super();
    this.block = block;
  }
  defaultBlock(): Block | undefined {
    return this.block;
  }
  blockNamed(name: string): Block | undefined {
    return this.block.getReferencedBlock(name) || undefined;
  }
}

export class CustomBlockScope extends LocalScope {
  _blockReferences: BlockReferenceMap;
  _defaultBlock: Block | undefined;
  constructor(defaultBlock?: Block, references?: BlockReferenceMap) {
    super();
    this._defaultBlock = defaultBlock;
    this._blockReferences = references || {};
  }
  setDefaultBlock(block: Block | undefined) {
    this._defaultBlock = block;
  }
  setBlockReference(localName: string, block: Block) {
    this._blockReferences[localName] = block;
  }
  defaultBlock(): Block | undefined {
    return this._defaultBlock;
  }
  blockNamed(name: string): Block | undefined {
    return this._blockReferences[name];
  }
}
