import { CSSBlocksAggregate, CSSBlocksAnalyze, Transport } from "@css-blocks/broccoli";
import { BroccoliOptions } from "@css-blocks/broccoli/dist/src/Analyze";
import { BlockFactory } from "@css-blocks/core";
import { GlimmerAnalyzer } from "@css-blocks/glimmer";
import { ResolverConfiguration } from "@glimmer/resolver";

import { Addon, AddonOptions, DEBUG, EmberAppAddon, Env, IDENTITY } from "./_utils";
import { IDAllocator } from "./IDAllocator";

// not sure of the best solution here, but this will do for now
interface CSSBlocksGlimmerAnalyzer extends GlimmerAnalyzer {
  transport: Transport;
}

function genTreeWrapper(this: Addon, env: Env, options: AddonOptions, type: string, prev = IDENTITY) {
  const { isEmber, app, parent, rootDir, moduleConfig, modulePrefix }: Env = env;

  // In Ember, we treat every template as an entry point. `BroccoliCSSBlocks` will
  // automatically discover all template files if an empty entry array is passed.
  const entry: Array<string | undefined> = isEmber ? [] : (options.entry && Array.isArray(options.entry) ? options.entry : [options.entry]);

  // I hate shared memory...
  let transport = new Transport(modulePrefix);
  if (this.transports && this.parent) {
    this.transports.set(this.parent, transport);
  }
  DEBUG(`Created transport object for ${modulePrefix}`);

  let analyzer = new GlimmerAnalyzer(new BlockFactory(options.parserOpts), options.analysisOpts, moduleConfig as ResolverConfiguration) as CSSBlocksGlimmerAnalyzer;
  analyzer.transport = transport;

  if (!this.idAllocator) {
    let identifiers = options.optimization.identifiers || {};
    this.idAllocator = new IDAllocator(identifiers.startValue, identifiers.maxCount);
  }
  let identifiers = this.idAllocator.getRangeForModuleAndType(this.parent as EmberAppAddon, type);
  let optimizationOptions = Object.assign({}, options.optimization, {identifiers});
  DEBUG(`Optimization is ${optimizationOptions.enabled ? "enabled" : "disabled"}. Identifier allocation for ${modulePrefix}/${type} is ${identifiers.startValue} - ${identifiers.startValue + identifiers.maxCount - 1}`);

  const broccoliOptions = {
    analyzer,
    entry,
    output: options.output,
    optimization: optimizationOptions,
    root: rootDir,
  } as BroccoliOptions;

  return (tree: unknown) => {
    if (!tree) { return prev.call(parent, tree); }
    tree = new CSSBlocksAnalyze(tree, transport, broccoliOptions);
    app.trees.cssblocks = new CSSBlocksAggregate([app.trees.cssblocks || app.trees.styles, tree], transport, this.aggregateFile as string);

    /*
     * Engines <=0.5.20 support.
     * Right now, engines will throw away the tree passed to `treeForAddon`
     * and re-generate it. In order for template rewriting to happen
     * after analysis, we need to overwrite the addon tree on the Engine and
     * clear the template files cache. This cache is seeded during parent app's
     * initialization of the engine in `this.jshintAddonTree()`.
     */
    if (prev.length < 1) {
      if (parent.options && parent.options.trees) {
        parent.options.trees.addon = tree;
      }
      parent._cachedAddonTemplateFiles = undefined;
    }

    return prev.call(parent, tree);
  };
}

export { genTreeWrapper };
