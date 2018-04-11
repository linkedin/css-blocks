import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import { TemplateTypes } from "@opticss/template-api";
import { Analyzer } from "css-blocks";

import { BroccoliPlugin } from "./utils";

const readdirAsync = promisify(fs.readdirSync) as (path: string) => Promise<string[]>;
const symlinkAsync = promisify(fs.symlinkSync) as (from: string, to: string) => Promise<void>;

interface BroccoliOptions {
  entry: string[];
  analyzer: Analyzer<keyof TemplateTypes>;
}

class BroccoliCSSBlocks extends BroccoliPlugin {

  private analyzer: Analyzer<keyof TemplateTypes>;
  private entry: string[];

  // tslint:disable-next-line:prefer-whatever-to-any
  constructor(inputNode: any, options: BroccoliOptions) {
    super([inputNode], {
      name: "broccoli-css-blocks",
    });
    this.analyzer = options.analyzer;
    this.entry = options.entry;
  }

  async build() {

    // This build step is just a pass-through of all files!
    // We're just analyzing right now.
    let files = await readdirAsync(this.inputPaths[0]);
    for (let file of files) {
      try {
        await symlinkAsync(
          path.join(this.inputPaths[0], file),
          path.join(this.outputPath, file),
        );
      } catch (e) {
        console.log("Error linking", path.join(this.inputPaths[0], file), "to output directory.");
      }
    }

    // Oh hey look, we're analyzing.
    await this.analyzer.analyze(...this.entry);

    // Here we'd compile the blocks, optionally optimize our output,
    // and inject the final CSS file into the tree. Then, attach our
    // StyleMapping data to whatever shared memory data transport we
    // have to pass to funnel rewrite data to our Rewriter.

    return this.analyzer;

  }

}

module.exports = BroccoliCSSBlocks;
