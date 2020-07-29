import { Analyzer, Block, BlockFactory, Options as CSSBlocksOptions, SerializedSourceAnalysis, resolveConfiguration } from "@css-blocks/core";
import { BroccoliTreeImporter, EmberAnalysis, TEMPLATE_TYPE, pathToIdent } from "@css-blocks/ember-support";
import { TemplateIntegrationOptions } from "@opticss/template-api";
import mergeTrees = require("broccoli-merge-trees");
import type { InputNode } from "broccoli-node-api";
import Filter = require("broccoli-persistent-filter");
import type { PluginOptions } from "broccoli-plugin/dist/interfaces";
import debugGenerator from "debug";
import * as FSTree from "fs-tree-diff";
import { Optimizer, postcss } from "opticss";

const debug = debugGenerator("css-blocks:ember-app");

class EmberAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  analyze(_dir: string, _entryPoints: string[]): Promise<Analyzer<"HandlebarsTemplate">> {
    throw new Error("Method not implemented.");
  }
  get optimizationOptions(): TemplateIntegrationOptions {
    return {
      rewriteIdents: {
        id: false,
        class: true,
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }
}

export class CSSBlocksApplicationPlugin extends Filter {
  appName: string;
  previousSourceTree: FSTree;
  cssBlocksOptions: CSSBlocksOptions;
  constructor(appName: string, inputNodes: InputNode[], cssBlocksOptions: CSSBlocksOptions, options?: PluginOptions) {
    super(mergeTrees(inputNodes), options || {});
    this.appName = appName;
    this.previousSourceTree = new FSTree();
    this.cssBlocksOptions = cssBlocksOptions;
  }
  processString(contents: string, _relativePath: string): string {
    return contents;
  }
  async build() {
    await super.build();
    let entries = this.input.entries(".", {globs: ["**/*.{compiledblock.css,block-analysis.json}"]});
    let currentFSTree = FSTree.fromEntries(entries);
    let patch = this.previousSourceTree.calculatePatch(currentFSTree);
    if (patch.length === 0) {
      // nothing changed from the last build.
      return;
    } else {
      this.previousSourceTree = currentFSTree;
    }
    let config = resolveConfiguration(this.cssBlocksOptions);
    let importer = new BroccoliTreeImporter(this.input, null, config.importer);
    config = resolveConfiguration({importer}, config);
    let factory = new BlockFactory(config, postcss);
    let analyzer = new EmberAnalyzer(factory);
    let blocks = new Array<Block>();
    // TODO: Make this configurable from the ember app.
    let optimizerOptions = {
      enabled: true,
      rewriteIdents: {
        id: false,
        class: true,
        omitIdents: {
          class: [], // TODO: scan css files for other classes in use.
        },
      },
      removeUnusedStyles: true,
      mergeDeclarations: false,
    };
    let optimizer = new Optimizer(optimizerOptions, analyzer.optimizationOptions);
    for (let entry of entries) {
      let ident = pathToIdent(entry.relativePath);
      if (entry.relativePath.endsWith(".compiledblock.css")) {
        debug(`Parsing precompiled block: ${entry.relativePath}`);
        let block: Block;
        block = await factory.getBlock(ident);
        debug(`Got block: ${block.identifier}`);
        optimizer.addSource({
          filename: entry.relativePath,
          content: block.stylesheet!.toResult({to: entry.relativePath}),
        });
        blocks.push(block);
      }
      if (entry.relativePath.endsWith(".block-analysis.json")) {
        debug(`Processing analysis: ${entry.relativePath}`);
        let serializedAnalysis: SerializedSourceAnalysis<TEMPLATE_TYPE> = JSON.parse(this.input.readFileSync(entry.relativePath, "utf8"));
        debug("blocks", serializedAnalysis.stylesFound);
        for (let blockId of Object.keys(serializedAnalysis.blocks)) {
          serializedAnalysis.blocks[blockId] = pathToIdent(serializedAnalysis.blocks[blockId]);
        }
        let analysis = await EmberAnalysis.deserializeSource(serializedAnalysis, factory, analyzer);
        optimizer.addAnalysis(analysis.forOptimizer(config));
      }
    }
    debug(`Loaded ${blocks.length} blocks.`);
    debug(`Loaded ${optimizer.analyses.length} analyses.`);

    this.output.writeFileSync(
      `${this.appName}/services/-css-blocks-data.js`,
      `// CSS Blocks Generated Data. DO NOT EDIT.
       export const data = {className: "it-worked"};
      `);
  }
}
