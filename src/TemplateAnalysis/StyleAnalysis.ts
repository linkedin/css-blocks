import { BlockObject, Block } from "../Block";

export interface StyleAnalysis {
  wasFound(style: BlockObject): boolean;
  isDynamic(style: BlockObject): boolean;
  areCorrelated(...styles: BlockObject[]): boolean;
  blockDependencies(): Set<Block>;
  transitiveBlockDependencies(): Set<Block>;
}