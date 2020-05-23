import { postcss } from "opticss";

import { Block } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";

export const INLINE_DEFINITION_FILE = Symbol("Inline Definition");

export type PathResolver = (config: ResolvedConfiguration, fromBlock: Block, toBlock: Block, fromPath: string) => string;

export const filesystemPathResolver: PathResolver = (_config: ResolvedConfiguration, _fromBlock: Block, _toBlock: Block, fromPath: string): string => {
  return fromPath.replace(".block", "");
};

export class BlockDefinitionCompiler {
  postcss: typeof postcss;
  config: ResolvedConfiguration;
  constructor(postcssImpl: typeof postcss, config: ResolvedConfiguration) {
    this.postcss = postcssImpl;
    this.config = config;
  }

  compile(block: Block, root: postcss.Root, _pathResolver: PathResolver): postcss.Root {
    this.blockReferences(root, block);
    return root;
  }

  blockReferences(root: postcss.Root, block: Block): void {
    block.eachBlockReference((name, _block) => {
      root.append(postcss.atRule({name: "block", params: `${name} from ""`}));
    });
  }

  insertReference(_css: postcss.Root, _definitionPath: string) {
    throw new Error("Method not implemented.");
  }
  insertInlineReference(_css: postcss.Root, _definition: postcss.Root) {
    throw new Error("Method not implemented.");
  }
}
