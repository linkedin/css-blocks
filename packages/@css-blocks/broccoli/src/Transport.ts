import { Analyzer, Block, StyleMapping } from "@css-blocks/core";
import { TemplateTypes } from "@opticss/template-api";

// Magic shared memory transport object 🤮
// This will disappear once we have a functional language server.
export class Transport {
  id: string;
  css = "";
  blocks: Set<Block> = new Set();
  mapping?: StyleMapping<keyof TemplateTypes>;
  analyzer?: Analyzer<keyof TemplateTypes>;

  constructor(id: string) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.css = "";
    this.blocks = new Set();
    this.mapping = undefined;
    this.analyzer = undefined;
  }
}
