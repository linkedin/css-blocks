import * as fs from "fs-extra";
import * as path from "path";

import { Analyzer, Block, BlockCompiler, StyleMapping } from "@css-blocks/core";
import { TemplateTypes } from "@opticss/template-api";
import * as debugGenerator from "debug";
import { OptiCSSOptions, Optimizer } from "opticss";
import { postcss } from "opticss";
import * as readdir from "recursive-readdir";

import { BroccoliPlugin } from "./utils";

const debug = debugGenerator("css-blocks:broccoli");

export interface Transport {
  id: string;
  mapping: StyleMapping<keyof TemplateTypes>;
  blocks: Set<Block>;
  analyzer: Analyzer<keyof TemplateTypes>;
  css: string;
}

export interface BroccoliOptions {
  entry: string[];
  output: string;
  analyzer: Analyzer<keyof TemplateTypes>;
  transport: Transport;
  optimization?: Partial<OptiCSSOptions>;
}

class BroccoliCSSBlocks extends BroccoliPlugin {

  private analyzer: Analyzer<keyof TemplateTypes>;
  private entry: string[];
  private output: string;
  private transport: Transport;
  private optimizationOptions: Partial<OptiCSSOptions>;

  // tslint:disable-next-line:prefer-whatever-to-any
  constructor(inputNode: any, options: BroccoliOptions) {
    super([inputNode], { name: "broccoli-css-blocks" });

    this.entry = options.entry.slice(0);
    this.output = options.output;
    this.analyzer = options.analyzer;
    this.transport = options.transport;
    this.optimizationOptions = options.optimization || {};

    this.transport.css = this.transport.css ? this.transport.css : "";

    if (!this.output) {
      throw new Error("CSS Blocks Broccoli Plugin requires an output file name.");
    }
  }

  async build() {
    let options = this.analyzer.cssBlocksOptions;
    let blockCompiler = new BlockCompiler(postcss, options);
    let optimizer = new Optimizer(this.optimizationOptions, this.analyzer.optimizationOptions);

    // When no entry points are passed, we treat *every* template as an entry point.
    let discover = !this.entry.length;

    // This build step is *mostly* just a pass-through of all files!
    // QUESTION: Tom, is there a better way to do this in Broccoli?
    let files = await readdir(this.inputPaths[0]);
    for (let file of files) {
      file = path.relative(this.inputPaths[0], file);

      // If we're in Classic or Pods mode, every hbs file is an entry point.
      if (discover && path.extname(file) === ".hbs") { this.entry.push(file); }

      await fs.ensureDir(path.join(this.outputPath, path.dirname(file)));
      try {
        await fs.symlink(
          path.join(this.inputPaths[0], file),
          path.join(this.outputPath, file),
        );
      } catch (e) {
        // tslint:disable-next-line:no-console
        console.log("Error linking", path.join(this.inputPaths[0], file), "to output directory.");
      }
    }

    // Oh hey look, we're analyzing.
    this.analyzer.reset();
    await this.analyzer.analyze(...this.entry);

    // Compile all Blocks and add them as sources to the Optimizer.
    // TODO: handle a sourcemap from compiling the block file via a preprocessor.
    let blocks = this.analyzer.transitiveBlockDependencies();
    for (let block of blocks) {
      if (block.stylesheet) {
        let root = blockCompiler.compile(block, block.stylesheet, this.analyzer);
        let result = root.toResult({ to: this.output, map: { inline: false, annotation: false } });
        let filesystemPath = options.importer.filesystemPath(block.identifier, options);
        let filename = filesystemPath || options.importer.debugIdentifier(block.identifier, options);

        // If this Block has a representation on disk, remove it from our output tree.
        // TODO: This isn't working right now because `importer.filesystemPath` doesn't return the expected path...
        if (filesystemPath) {
          debug(`Removing block file ${path.relative(options.rootDir, filesystemPath)} from output.`);
          await fs.unlink(path.join(this.outputPath, path.relative(options.rootDir, filesystemPath)));
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
    debug(this.transport.css);

  }

}

export { BroccoliCSSBlocks };
