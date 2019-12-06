import { Analyzer, BlockCompiler, StyleMapping } from "@css-blocks/core";
import { TemplateTypes } from "@opticss/template-api";
import * as debugGenerator from "debug";
import * as fs from "fs";
import * as FSTree from "fs-tree-diff";
import * as glob from "glob";
import * as minimatch from "minimatch";
import { OptiCSSOptions, Optimizer, postcss } from "opticss";
import * as path from "path";
import * as walkSync from "walk-sync";

import { Transport } from "./Transport";
import { BroccoliPlugin } from "./utils";

const debug = debugGenerator("css-blocks:broccoli");

export interface BroccoliOptions {
  entry: string[];
  output: string;
  root: string;
  analyzer: Analyzer<keyof TemplateTypes>;
  optimization?: Partial<OptiCSSOptions>;
}

/**
 * Runs analysis on an `inputNode` that represents the entire
 * application. `options.transport` will be populated with
 * analysis results. Output is the same application tree
 * with all Block files removed.
 */
export class CSSBlocksAnalyze extends BroccoliPlugin {

  private analyzer: Analyzer<keyof TemplateTypes>;
  private entries: string[];
  private output: string;
  private transport: Transport;
  private optimizationOptions: Partial<OptiCSSOptions>;
  private previousInput: FSTree = new FSTree();

  /**
   * Initialize this new instance with the app tree, transport, and analysis options.
   * @param inputNode Single Broccoli tree node containing *entire* app.
   * @param transport Magical shared-memory Transport object shared with the aggregator and Template transformer.
   * @param options Analysis options.
   */
  // tslint:disable-next-line:prefer-unknown-to-any
  constructor(inputNode: any, transport: Transport, options: BroccoliOptions) {
    super([inputNode], {
      name: "broccoli-css-blocks-analyze",
      persistentOutput: true,
    });
    this.transport = transport;
    this.entries = options.entry.slice(0);
    this.output = options.output || "css-blocks.css";
    this.optimizationOptions = options.optimization || {};
    this.analyzer = options.analyzer;
    this.transport.css = this.transport.css ? this.transport.css : "";
  }

  /**
   * Re-run the broccoli build over supplied inputs.
   */
  async build() {
    // We currently rely on the fact that the input path is a source directory
    // and not a temp directory from a previous build step.
    // When the input directory is a temp directory, the block guid
    // becomes unstable across brocolli build processes which can cause
    // persistent cache incoherence within the templates.
    let input = path.resolve(this.inputPaths[0]);
    let output = this.outputPath;
    let options = this.analyzer.cssBlocksOptions;
    let blockCompiler = new BlockCompiler(postcss, options);
    let optimizer = new Optimizer(this.optimizationOptions, this.analyzer.optimizationOptions);

    let isBlockFile = minimatch.makeRe("**/*.block.*");

    // Test if anything has changed since last time. If not, skip all analysis work.
    let newFsTree = FSTree.fromEntries(walkSync.entries(input));
    let diff = this.previousInput.calculatePatch(newFsTree);
    this.previousInput = newFsTree;
    if (!diff.length) { return; }

    // Get all the operations for files that aren't related to CSS Block files
    // So they can be performed on the output directory.
    let nonBlockFileChanges = new Array<FSTree.Operation>();
    for (let op of diff) {
      let entry = op[2];
      if (entry && entry.relativePath.match(isBlockFile)) {
        continue;
      }
      nonBlockFileChanges.push(op);
    }

    FSTree.applyPatch(input, output, nonBlockFileChanges);

    // When no entry points are passed, we treat *every* template as an entry point.
    this.entries = this.entries.length ? this.entries : glob.sync("**/*.hbs", { cwd: input });

    // Oh hey look, we're analyzing.
    this.analyzer.reset();
    this.transport.reset();
    await this.analyzer.analyze(input, this.entries);

    // Compile all Blocks and add them as sources to the Optimizer.
    // TODO: handle a sourcemap from compiling the block file via a preprocessor.
    let blocks = this.analyzer.transitiveBlockDependencies();
    for (let block of blocks) {
      if (block.stylesheet) {
        let root = blockCompiler.compile(block, block.stylesheet, this.analyzer);
        let result = root.toResult({ to: this.output, map: { inline: false, annotation: false } });
        let filesystemPath = options.importer.filesystemPath(block.identifier, options);
        let filename = filesystemPath || options.importer.debugIdentifier(block.identifier, options);

        if (filesystemPath && filesystemPath.startsWith(input)) {
          let relativePath = path.relative(input, filesystemPath);
          let outputPath = path.resolve(output, relativePath);
          try {
            fs.unlinkSync(outputPath);
          } catch (e) {
            // ignore
          }
        }

        // Add the compiled Block file to the optimizer.
        optimizer.addSource({
          content: result.css,
          filename,
          sourceMap: result.map.toJSON(),
        });
      }
    }

    // Add each Analysis to the Optimizer.
    this.analyzer.eachAnalysis((a) => optimizer.addAnalysis(a.forOptimizer(options)));

    // Run optimization and compute StyleMapping.
    let optimized = await optimizer.optimize(this.output);
    let styleMapping = new StyleMapping<keyof TemplateTypes>(optimized.styleMapping, blocks, options, this.analyzer.analyses());

    // Attach all computed data to our magic shared memory transport object...
    this.transport.mapping = styleMapping;
    this.transport.blocks = blocks;
    this.transport.analyzer = this.analyzer;
    this.transport.css += optimized.output.content.toString();
    debug(`Compilation Finished: ${this.transport.id}`);
  }
}
