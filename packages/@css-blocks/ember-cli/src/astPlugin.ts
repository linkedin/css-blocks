/* tslint:disable:prefer-unknown-to-any */
import { Transport } from "@css-blocks/broccoli";
import { GlimmerAnalysis, GlimmerRewriter, GlimmerStyleMapping } from "@css-blocks/glimmer";
import path from "path";

import { Addon, DEBUG, EmberAppAddon } from "./_utils";

// Default no-op plugin for templates with no associated CSS Block.
// `visitors` is used by Ember < 3.0.0. `visitor` is used by Glimmer and Ember >= 3.0.0.
const NOOP_PLUGIN = {
  name: "css-blocks-noop",
  visitors: {},
  visitor: {},
  cacheKey: () => { return 1; },
};

// TODO: investigate compatibility here with GlimmerRewriter.
// maybe change most of the properties in this to optional? Or something?
const NOOP = NOOP_PLUGIN as unknown as GlimmerRewriter;

// Shared AST plugin implementation for Glimmer and Ember.
export function astPlugin(this: Addon, env: any): GlimmerRewriter {
  let modulePrefix = this._modulePrefix();
  let transport: Transport = this.transports!.get(this.parent as EmberAppAddon) as Transport;

  // If there is no analyzer or mapping for this template in the transport, don't do anything.
  if (!transport) {
    DEBUG(`No transport object found found for "${modulePrefix}". Skipping rewrite.`);
    return NOOP;
  }

  // Woo, shared memory wormhole!...
  let { analyzer, mapping } = transport;

  // If there is no analyzer or mapping for this template in the transport, don't do anything.
  if (!analyzer || !mapping) {
    DEBUG(`No mapping object found found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
    return NOOP;
  }

  // If no specifier data for this template, pass through silently.
  if (!env.meta.moduleName && !env.meta.specifier) {
    return NOOP;
  }

  // TODO: Write a better `getAnalysis` method on `Analyzer`
  // TODO: The differences in what Ember and Glimmer provide in env.meta should be resolved.
  let analysis: GlimmerAnalysis;
  if (this.isEmber) {
    analysis = analyzer.analyses().find(a => env.meta.moduleName === path.join(modulePrefix, a.template.identifier)) as GlimmerAnalysis;
  } else {
    analysis = analyzer.analyses().find(a => env.meta.specifier === a.template.identifier) as GlimmerAnalysis;
  }

  // If there is no analysis for this template in any of the transports, don't do anything.
  if (!analysis) {
    DEBUG(`No analysis found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
    return NOOP;
  }

  // If we do have a matching analysis, run the rewriter transforms!
  DEBUG(`Generating AST rewriter for "${analysis.template.identifier}"`);
  return new GlimmerRewriter(env.syntax, mapping as GlimmerStyleMapping, analysis, this._options!.parserOpts);

}
