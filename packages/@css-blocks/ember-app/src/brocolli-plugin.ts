import mergeTrees = require("broccoli-merge-trees");
import type { InputNode } from "broccoli-node-api";
import Filter = require("broccoli-persistent-filter");
import type { PluginOptions } from "broccoli-plugin/dist/interfaces";

export class CSSBlocksApplicationPlugin extends Filter {
  appName: string;
  constructor(appName: string, inputNodes: InputNode[], options?: PluginOptions) {
    super(mergeTrees(inputNodes), options || {});
    this.appName = appName;
  }
  processString(contents: string, _relativePath: string): string {
    return contents;
  }
  async build() {
    await super.build();
    console.log(`XXX ${this.appName}`);
    let entries = this.input.entries(".", {globs: ["**/*"]});
    for (let entry of entries) {
      console.log(entry.relativePath);
    }
    this.output.writeFileSync(
      `${this.appName}/services/-css-blocks-data.js`,
      `// CSS Blocks Generated Data. DO NOT EDIT.
       export const data = {className: "it-worked"};
      `);
  }
}
