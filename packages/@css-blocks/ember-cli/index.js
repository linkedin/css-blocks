'use strict';

const { BroccoliCSSBlocks } = require("@css-blocks/broccoli");
const { GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");

const Plugin = require("broccoli-plugin")
const debugGenerator = require("debug");
const fs = require("fs-extra");
const path = require("path");
const symlinkOrCopy = require('symlink-or-copy');

const DEBUG = debugGenerator("css-blocks:ember-cli");

const OUTPUT_NAME = "assets/css-blocks.css";
const EMBER_MODULE_CONFIG = undefined;
const GLIMMER_MODULE_CONFIG = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
GLIMMER_MODULE_CONFIG.types.stylesheet = { definitiveCollection: "components" };
GLIMMER_MODULE_CONFIG.collections.components.types.push("stylesheet");

// Process-global dumping zone for CSS output as it comes through the pipeline 🤮
// This should all go away once we have a functional language server.
let TRANSPORT = "";
class CSSOutput extends Plugin {
  constructor(inputNodes, transport){
    super(inputNodes, { name: "broccoli-css-blocks-output" });
    this.transport = transport;
  }
  async build() {
    TRANSPORT += this.transport.css;
    if (this._linked) { return } // Will this break Windows?
    await fs.rmdir(output);
    symlinkOrCopy.sync(this.inputPaths[0], this.outputPath);
    this._linked = true;
  }
}

module.exports = {
  name: '@css-blocks/ember-cli',
  isDevelopingAddon() { return true; },

  // Shared AST plugin implementation for Glimmer and Ember.
  astPlugin(env) {

    // Woo, shared memory wormhole!...
    let { analyzer, mapping } = this.transport;

    if (!analyzer || !mapping) {
      throw new Error("No CSS Blocks template analysis data found.");
    }

    // TODO: Write a better `getAnalysis` method on `Analyzer`
    // TODO: The differences in what Ember and Glimmer provide in env.meta should be resolved.
    let analysis;
    if (this.isEmber) {
      analysis = analyzer.analyses().find(a => env.meta.moduleName && !!~env.meta.moduleName.indexOf(a.template.path));
    } else {
      analysis = analyzer.analyses().find(a => a.template.identifier === env.meta.specifier);
    }

    // If there is no analysis for this template, don't do anything.
    if (!analysis) {
      DEBUG(`No analysis found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
      return { name: 'css-blocks-noop', visitors: {} };
    }

    // Otherwise, run the rewriter transforms!
    DEBUG(`Generating AST rewriter for "${analysis.template.identifier}"`);
    return new GlimmerRewriter(env.syntax, mapping, analysis);
  },

  setupPreprocessorRegistry(type, registry) {

    if (type !== 'parent') { return; }

    DEBUG(`Registering handlebars AST plugin generators."`);

    // For Ember
    registry.add("htmlbars-ast-plugin", {
      name: "css-blocks-htmlbars",
      plugin: this.astPlugin.bind(this)
    });

    // For Glimmer
    registry.add("glimmer-ast-plugin", this.astPlugin.bind(this));
  },

  // Inject out built CSS Blocks stylesheet into the head.
  contentFor(type, config) {
    if (type === "head-footer") {
      return `<link rel="stylesheet" href="${config.rootURL || '/'}${OUTPUT_NAME}">`;
    }
  },

  // TODO: This transport object need to be defined by CSS Blocks Core.
  //       We use the same construct in both Broccoli and Webpack and
  //       the data model for each should be standardized to Analyzers
  //       and Rewriters consistently know how to communicate.
  reset() {
    DEBUG(`Resetting transport object for: ${this.rootDir}`);
    this.transport = this.transport || { id: this.rootDir };
    delete this.transport.css;
    delete this.transport.mapping;
    delete this.transport.blocks;
    delete this.transport.analyzer;
    TRANSPORT = "";
  },

  async postBuild(result){
    DEBUG(`Build finished – writing css-blocks.css to output."`);
    let out = path.join(result.directory, OUTPUT_NAME);
    await fs.ensureFile(out);
    await fs.writeFile(out, TRANSPORT);
    this.reset();
  },

  included(parent) {
    this._super.included.apply(this, arguments);

    const app = parent.app ? parent.app : parent;
    const options = app.options["css-blocks"] || {
      parserOpts: {},
      analysisOpts: {},
      optimization: {},
    };

    // Optimization is allways disabled for now, until we get project-wide analysis working.
    options.optimization.enabled = false;

    // The absolute path to the root of our app (aka: the directory that contains "src").
    // Needed because app root !== project root in addons – its located at `tests/dummy`.
    // TODO: Is there a better way to get this for Ember?
    const rootDir = this.rootDir = parent.root || parent.project.root;

    // Because we have slightly different logic depending on the app type.
    // TODO: Is there a better way to get this env info?
    this.isEmber = !!~app.constructor.name.indexOf("Ember");
    this.isAddon = this.isEmber && !~parent.constructor.name.indexOf("Ember");
    this.isGlimmer = !this.isEmber;

    this.reset();

    // TODO: Better options validation.
    if (options.output && options.output !== OUTPUT_NAME) {
      throw new Error(`CSS Blocks output file names are auto-generated in ${this.isEmber ? "Ember": "glimmer"} apps. Do not pass an "output" option in your CSS Blocks config.`);
    }
    if (!this.isEmber && typeof options.entry !== "string" && !Array.isArray(options.entry)) {
      throw new Error("Invalid css-block options in `ember-cli-build.js`: Entry option must be a string or array.");
    }
    if (this.isEmber && options.entry) {
      throw new Error(`CSS Blocks entry points are auto-discovered in Ember apps. Do not pass an "entry" option in your CSS Blocks config.`);
    }

    // TODO: Module configs are different depending on Glimmer vs Ember.
    //       Ideally fetching the module config is baked into ember-cli and we can
    //       simply augment a copy of it for our analysis phase since we don't actually
    //       deliver any resolvable files, but we need to have our `stylesheet.css`s be
    //       resolvable by `glimmer-analyzer` during the build...
    let moduleConfig = this.isGlimmer ? GLIMMER_MODULE_CONFIG : EMBER_MODULE_CONFIG;

    // Depending on the type of the target, there are different source directory roots.
    //  - For Glimmer apps, use `src`.
    //  - For Addons, use `addon`.
    //  - For Ember dummy apps, use `tests/dummy/app`.
    //  - For Ember apps, use `app`.
    let srcDir = "src";
    if (this.isAddon) { srcDir = "addon"; }
    // TODO: @spenner, is there a better way to get this path?
    else if (this.isEmber && app.name === "dummy") { srcDir = "tests/dummy/app"; }
    else if (this.isEmber) { srcDir = "app"; }

    // Path to the `src` directory, relative to project root.
    if (moduleConfig) {
      moduleConfig.app || (moduleConfig.app = {});
      moduleConfig.app.mainPath = srcDir;
    }

    // Update parserOpts to include the absolute path to our application code directory.
    // TODO: Glimmer includes the `src` directory in working trees, while Ember treats
    //       the working tree as the `app` root. This discrepancy is annoying and should
    //       reconciled.
    options.parserOpts.rootDir = path.join(rootDir, this.isEmber ? srcDir : "");
    options.output = OUTPUT_NAME;

    // Ember-cli is *mostly* used with Glimmer. However, it can technically be
    // configured to use other template types. Here we default to the Glimmer
    // analyzer, but if a `getAnalyzer` function is provided we defer to the
    // user-supplied analyzer.
    let analyzer = options.getAnalyzer ?
      options.getAnalyzer(parent) :
      new GlimmerAnalyzer(rootDir, srcDir, moduleConfig, options.parserOpts, options.analysisOpts);

    // In Ember, we treat every template as an entry point. `BroccoliCSSBlocks` will
    // automatically discover all template files if an empty entry array is passed.
    const entries = this.isEmber ? [] : (Array.isArray(options.entry) ? options.entry : [options.entry]);

    const broccoliOptions = {
      entry: entries,
      output: options.output,
      analyzer,
      transport: this.transport, // I hate shared memory...
      optimization: options.optimization,
    };

    // Analyze all templates and block files from `/app` in addons.
    const oldTreeForApp = parent.treeForApp && parent.treeForApp.bind(parent);
    parent.treeForApp = (tree) => {
      tree = new BroccoliCSSBlocks(tree, broccoliOptions);
      app.trees.styles = new CSSOutput([app.trees.styles, tree], this.transport);
      return oldTreeForApp ? oldTreeForApp(tree) : tree;
    };

    // Analyze all templates and block files from `/addon` in addons.
    const oldTreeForAddon = parent.treeForAddon && parent.treeForAddon.bind(parent);
    parent.treeForAddon = (tree) => {
      tree = new BroccoliCSSBlocks(tree, broccoliOptions);
      app.trees.styles = new CSSOutput([app.trees.styles, tree], this.transport);
      return oldTreeForAddon ? oldTreeForAddon(tree) : tree;
    };

    // Analyze all templates and block files from `/app` || `/src` in Ember/Glimmer applications.
    if (parent.trees) {
      let treeName = this.isEmber ? "app" : "src";
      parent.trees[treeName] = new BroccoliCSSBlocks(parent.trees[treeName], broccoliOptions);
      app.trees.styles = new CSSOutput([app.trees.styles, parent.trees[treeName]], this.transport);
    }
  }
};