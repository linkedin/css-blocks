/* eslint-env node */
"use strict";

const { BroccoliCSSBlocks } = require("@css-blocks/broccoli");
const { Project, GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");
const path = require("path");
const Funnel = require("broccoli-funnel");

// QUESTION: Tom, how to we get the app's module config!?
//           Is it possible for addons to augment it?
//           If no, how to apps augment it?
const MODULE_CONFIG = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
MODULE_CONFIG.types.stylesheet = { definitiveCollection: "components" };
MODULE_CONFIG.collections.components.types.push("stylesheet");

module.exports = {
  name: "css-blocks",

  isDevelopingAddon() { return true; },

  setupPreprocessorRegistry(type, registry) {
    if (type !== 'parent') { return; }
    let self = this;
    registry.add("glimmer-ast-plugin", function(env) {
      // Woo, shared memory wormhole!...
      let { analyzer, mapping } = self.transport;

      // TODO: Write a better `getAnalysis` method on `Analyzer`
      let analysis = analyzer.analyses().find(a => a.template.identifier === env.meta.specifier);

      // If there is no analysis for this template, don't do anything.
      // Otherwise, run the rewriter!
      if (!analysis) { return { name: 'css-blocks-noop', visitors: {} }; }
      return new GlimmerRewriter(env.syntax, mapping, analysis);
    });
  },

  included(app) {

    this._super.included.apply(this, arguments);

    let options = app.options["css-blocks"] || {};
    let parserOpts = options.parserOpts || {};
    let analysisOpts = options.analysisOpts || {};
    let optimizerOpts = options.optimization || {};

    // Ember-cli is *mostly* used with Glimmer. However, it can technically be
    // configured to use other template types. Here we default to the Glimmer
    // analyzer, but if a `getAnalyzer` function is provided we defer to the
    // user-supplied analyzer.
    let analyzer = options.getAnalyzer ?
      options.getAnalyzer(app) :
      new GlimmerAnalyzer(new Project(app.project.root, MODULE_CONFIG), parserOpts, analysisOpts);

    // TODO: Better options validation.
    if (typeof options.entry !== "string") {
      throw new Error("Invalid css-block options in `ember-cli-build.js`: Entry option must be a string.");
    }
    if (typeof options.output !== "string") {
      throw new Error("Invalid css-block options in `ember-cli-build.js`: Output option must be a string.");
    }

    // TODO: This transport object need to be defined by CSS Blocks Core.
    //       We use the same construct in both Broccoli and Webpack and
    //       the data model for each should be standardized to Analyzers
    //       and Rewriters consistently know how to communicate.
    this.transport = {};

    app.trees.src = new BroccoliCSSBlocks(app.trees.src, {
      entry: [options.entry],
      output: options.output,
      analyzer,
      transport: this.transport, // I hate shared memory...
      optimization: optimizerOpts,
    });

    // Remove all source css-blocks stylesheets
    // TODO: This should remove all resolved Block object identifiers on the Analyzer.
    //       This should be handled by @css-blocks/broccoli, but we have a bug.
    app.trees.src = new Funnel(app.trees.src, {
      exclude: ["**/stylesheet.css"]
    });

    // Place our generated CSS files into Glimmer's styles tree.
    // Glimmer splits out its `styles` tree before we get our hands
    // on the project, we need to re-insert all the project-wide
    // work we did in the `src` tree here once we're done for it
    // to be reflected in the final output.
    // TODO: We will be working with Tom to improve how Glimmer
    //       exposes its app trees.
    app.trees.styles = new Funnel(app.trees.src, {
      include: ["src/ui/styles/**/*"]
    });

  }
};