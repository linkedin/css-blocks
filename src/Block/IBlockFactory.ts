import { FileIdentifier } from "../importing";
import { Block } from "./Block";

export interface IBlockFactory {
  getBlock(identifier: FileIdentifier): Promise<Block>;
  getBlockRelative(fromIdentifier: FileIdentifier, importPath: string): Promise<Block>;
}