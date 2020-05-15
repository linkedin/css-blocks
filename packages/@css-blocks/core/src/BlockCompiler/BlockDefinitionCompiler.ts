import { postcss } from "opticss";

import { Block } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";

export const INLINE_DEFINITION_FILE = Symbol("Inline Definition");
export class BlockDefinitionCompiler {
  postcss: typeof postcss;
  config: ResolvedConfiguration;
  constructor(postcssImpl: typeof postcss, config: ResolvedConfiguration) {
    this.postcss = postcssImpl;
    this.config = config;
  }

  compile(_block: Block): postcss.Root {
    throw new Error("Method not implemented.");
    // return postcss.root();
  }

  insertReference(_css: postcss.Root, _definitionPath: string) {
    throw new Error("Method not implemented.");
  }
  insertInlineReference(_css: postcss.Root, _definition: postcss.Root) {
    throw new Error("Method not implemented.");
  }
}
