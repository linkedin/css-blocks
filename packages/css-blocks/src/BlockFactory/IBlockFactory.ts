import { Block } from "../Block";
import { FileIdentifier } from "../importing";

export interface IBlockFactory {
  getUniqueBlockName(name: string): string;
  getBlockFromPath(path: string): Promise<Block>;
  getBlock(identifier: FileIdentifier): Promise<Block>;
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block>;
  reset(): void;
}
