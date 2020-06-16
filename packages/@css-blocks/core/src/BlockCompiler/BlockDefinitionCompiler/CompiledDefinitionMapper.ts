import { DefinitionAST, Mapper, Name, Rename, builders } from "../../BlockParser/ast";
import { Block } from "../../BlockTree";

export type PathResolver = (block: Block, fromPath: string) => string;

export class CompiledDefinitionMapper implements Mapper<DefinitionAST> {
  pathResolver: PathResolver;
  block: Block;
  constructor(block: Block, pathResolver: PathResolver) {
    this.block = block;
    this.pathResolver = pathResolver;
  }
  BlockExport(fromPath: string, exports: Array<Name | Rename>) {
    fromPath = this.pathResolver(this.block, fromPath);
    return builders.blockExport(fromPath, exports);
  }
  BlockReference(fromPath: string, defaultName: string, references: Array<Name | Rename>) {
    fromPath = this.pathResolver(this.block, fromPath);
    return builders.blockReference(fromPath, defaultName, references);
  }
}
