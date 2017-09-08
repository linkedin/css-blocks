import { FileIdentifier } from "../importing";
import { Block } from "./Block";

export interface IBlockFactory {
  getUniqueBlockName(name: string): string;
  getBlockFromPath(path: string): Promise<Block>;
  getBlock(identifier: FileIdentifier): Promise<Block>;
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block>;
  reset(): void;
}
