
import * as fs from "fs-extra";
import * as FSTree from "fs-tree-diff";
import * as path from "path";
import * as walkSync from "walk-sync";

import { Transport } from "./Transport";
import { BroccoliPlugin } from "./utils";

// Common CSS preprocessor file endings to auto-discover
const COMMON_FILE_ENDINGS = [".scss", ".sass", ".less", ".stylus"];

/**
 * Process-global dumping zone for CSS output as it comes through the pipeline 🤮
 * This will disappear once we have a functional language server and replaced
 * with a post-build step.
 */
export class CSSBlocksAggregate extends BroccoliPlugin {

  private transport: Transport;
  private out: string;
  private _out = "";
  private previousCSS = "";
  private previous = new FSTree();

  /**
   * Initialize this new instance with the app tree, transport, and analysis options.
   * @param inputNodes Broccoli trees who's output we depend on. First node must be the tree where stylesheets are placed.
   * @param transport Magical shared-memory Transport object shared with the aggregator and Template transformer.
   * @param out Output file name.
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  constructor(inputNodes: any[], transport: Transport, out: string) {
    super(inputNodes, {
      name: "broccoli-css-blocks-aggregate",
      persistentOutput: true,
    });
    this.transport = transport;
    this.out = out;
  }

  /**
   * Re-run the broccoli build over supplied inputs.
   */
  build() {
    let output = this.outputPath;
    let input = this.inputPaths[0];
    let { id, css } = this.transport;

    // Test if anything has changed since last time. If not, skip trying to update tree.
    let newFsTree = FSTree.fromEntries(walkSync.entries(input));
    let diff = this.previous.calculatePatch(newFsTree);

    // Auto-discover common preprocessor extensions.
    if (!this._out) {
      let prev = path.parse(path.join(input, this.out));
      let origExt = prev.ext;
      prev.base = ""; // Needed for path.format to register ext change
      for (let ending of COMMON_FILE_ENDINGS) {
        prev.ext = ending;
        if (fs.existsSync(path.format(prev))) { break; }
        prev.ext = origExt;
      }
      let out = path.parse(this.out);
      out.base = ""; // Needed for path.format to register ext change
      out.ext = prev.ext;
      this._out = path.format(out);
    }

    if (diff.length) {
      this.previous = newFsTree;
      let newDiff = new Array<FSTree.Operation>();
      for (let change of diff) {
        let file = change[1];
        if (file === this._out) {
          continue;
        }
        newDiff.push(change);
      }
      FSTree.applyPatch(input, output, newDiff);
    }

    let outHasChanged = !!diff.find((o) => o[1] === this._out);
    if (outHasChanged || this.previousCSS !== css) {
      let prev = path.join(input, this._out);
      let out = path.join(output, this._out);
      prev = fs.existsSync(prev) ? fs.readFileSync(prev).toString() : "";
      if (fs.existsSync(out)) { fs.unlinkSync(out); }
      fs.writeFileSync(out, `${prev}\n/* CSS Blocks Start: "${id}" */\n${css}\n/* CSS Blocks End: "${id}" */\n`);
      this.previousCSS = css;
    }
  }
}
