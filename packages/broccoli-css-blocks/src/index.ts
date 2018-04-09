import * as fs from "fs";
import * as path from "path";

import { Analyzer } from "css-blocks";
import { TemplateTypes } from "@opticss/template-api";

import { BroccoliPlugin } from "./utils";

interface BroccoliOptions {
  entry: string[];
  analyzer: Analyzer<keyof TemplateTypes>;
}

class BroccoliBlocks extends BroccoliPlugin {

  private analyzer: Analyzer<keyof TemplateTypes>;
  private entry: string[];

  constructor(inputNode: any, options: BroccoliOptions) {
    super([inputNode], {
      name: "broccoli-css-blocks"
    });
    this.analyzer = options.analyzer;
    this.entry = options.entry;
  }

  async build() {

    // This build step is just a pass-through of all files!
    // We're just analyzing right now.
    // TODO: Make async!
    fs.readdirSync(this.inputPaths[0]).forEach((file) => {
      try {
        fs.symlinkSync(
          path.join(this.inputPaths[0], file),
          path.join(this.outputPath, file),
        );
      } catch(e){
        // This shouldn't ever happen...
        console.log("Error linking", path.join(this.inputPaths[0], file));
      }
    });

    // Oh hey look, we're analyzing.
    return this.analyzer.analyze(...this.entry).then(() => {
      console.log(arguments);
    });

  }

}

module.exports = BroccoliBlocks;