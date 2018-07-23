'use strict';

const { BroccoliCSSBlocks } = require("@css-blocks/broccoli");
const { GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");

const Plugin = require("broccoli-plugin")
const debugGenerator = require("debug");
const fs = require("fs-extra");
const path = require("path");
const symlinkOrCopy = require('symlink-or-copy');

const DEBUG = debugGenerator("css-blocks:ember-cli");

const EMBER_MODULE_CONFIG = undefined;
const GLIMMER_MODULE_CONFIG = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
GLIMMER_MODULE_CONFIG.types.stylesheet = { definitiveCollection: "components" };
GLIMMER_MODULE_CONFIG.collections.components.types.push("stylesheet");

// Default tree hook no-op function.
const NOOP = (tree) => tree;

// Magic shared memory transport object 🤮
// This will disappear once we have a functional language server.
class Transport {
  constructor(id) {
    this.id = id;
  }
  reset() {
    this.css = "";
    this.mapping = undefined;
    this.blocks = undefined;
    this.analyzer = undefined;
  }
}

// Process-global dumping zone for CSS output as it comes through the pipeline 🤮
// This will disappear once we have a functional language server.
let PROCESS_OUTPUT = "";
class CSSOutput extends Plugin {
  constructor(inputNodes, transport){
    super(inputNodes, { name: "broccoli-css-blocks-output" });
    this.transport = transport;
  }
  async build() {
    PROCESS_OUTPUT += this.transport.css;
    if (this._linked) { return } // Will this break Windows?
    fs.rmdirSync(this.outputPath);
    symlinkOrCopy.sync(this.inputPaths[0], this.outputPath);
    this._linked = true;
  }
}

module.exports = {
  name: '@css-blocks/ember-cli',
  isDevelopingAddon() { return true; },
  transports: [],

  // Shared AST plugin implementation for Glimmer and Ember.
  astPlugin(env) {

    for (let transport of this.transports) {

      // Woo, shared memory wormhole!...
      let { analyzer, mapping } = transport;

      if (!analyzer || !mapping) { continue; }

      // TODO: Write a better `getAnalysis` method on `Analyzer`
      // TODO: The differences in what Ember and Glimmer provide in env.meta should be resolved.
      let analysis;
      if (this.isEmber) {
        analysis = analyzer.analyses().find(a => env.meta.moduleName && !!~env.meta.moduleName.indexOf(a.template.path));
      } else {
        analysis = analyzer.analyses().find(a => a.template.identifier === env.meta.specifier);
      }

      // If no analysis found for this template, keep looking.
      if (!analysis) { continue; }

      // If we do have a matching analysis, run the rewriter transforms!
      DEBUG(`Generating AST rewriter for "${analysis.template.identifier}"`);
      return new GlimmerRewriter(env.syntax, mapping, analysis);
    }

    // If there is no analysis for this template in any of the transports, don't do anything.
    DEBUG(`No analysis found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
    return { name: 'css-blocks-noop', visitors: {} };

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

  included(parent) {
    this._super.included.apply(this, arguments);

    // Fetch information about the environment we're running in.
    let env = this.getEnv(parent);

    // Fetch and validate user-provided options.
    let options = this.getOptions(env);

    // TODO: Would like to get rid of this, is now only used in `this.astPlugin`.
    this.isEmber = env.isEmber;

    // Analyze all templates and block files from `/app` in addons.
    parent.treeForApp = this.genTreeWrapper(env, options, parent.treeForApp);

    // Analyze all templates and block files from `/addon` in addons.
    parent.treeForAddon = this.genTreeWrapper(env, options, parent.treeForAddon);

    // Analyze all templates and block files from `/app` in Ember apps.
    // Analyze all templates and block files from `/src` in Glimmer apps.
    if (parent.trees) {
      let treeName = env.isEmber ? "app" : "src";
      parent.trees[treeName] = this.genTreeWrapper(env, options)(parent.trees[treeName]);
    }

  },

  // Once the build is finished, we can safely write our final CSS to
  // disk and clean up the pipes a little bit.
  async postBuild(result){
    DEBUG(`Build finished – writing css-blocks.css to output."`);
    let out = path.join(result.directory, "assets/vendor.css");
    fs.ensureFileSync(out);
    fs.appendFileSync(out, PROCESS_OUTPUT);

    // Reset all magical shared memory objects between rebuilds 🤮
    // This will disappear once we have a functional language server.
    // TODO: Not be great for caching, will have to rework this later.
    DEBUG(`Resetting all CSS caches.`);
    PROCESS_OUTPUT = "";
    for (let transport of this.transports) transport.reset();
  },

  getEnv(parent){

    // Fetch a reference to the parent app
    let app = parent.app ? parent.app : parent;

    // The absolute path to the root of our app (aka: the directory that contains "src").
    // Needed because app root !== project root in addons – its located at `tests/dummy`.
    // TODO: Is there a better way to get this for Ember?
    let rootDir = parent.root || parent.project.root;

    // Because we have slightly different logic depending on the app type.
    // TODO: Is there a better way to get this env info?
    let isEmber = !!~app.constructor.name.indexOf("Ember");
    let isAddon = isEmber && !~parent.constructor.name.indexOf("Ember");
    let isGlimmer = !isEmber;

    // TODO: Module configs are different depending on Glimmer vs Ember.
    //       Ideally fetching the module config is baked into ember-cli and we can
    //       simply augment a copy of it for our analysis phase since we don't actually
    //       deliver any resolvable files, but we need to have our `stylesheet.css`s be
    //       resolvable by `glimmer-analyzer` during the build...
    let moduleConfig = isGlimmer ? GLIMMER_MODULE_CONFIG : EMBER_MODULE_CONFIG;
    if (moduleConfig) {
      moduleConfig.app || (moduleConfig.app = {});
      moduleConfig.app.mainPath = "src";
    }

    return {
      parent,  app,
      rootDir, isEmber,
      isAddon, isGlimmer,
      moduleConfig,
    };
  },

  getOptions(env) {

    let { isEmber, app, rootDir } = env;

    // Get CSS Blocks options provided by the application, if present.
    const options = app.options["css-blocks"]
      ? JSON.parse(JSON.stringify(app.options["css-blocks"]))
      : {
        parserOpts: {},
        analysisOpts: {},
        optimization: {},
      };

    // Optimization is always disabled for now, until we get project-wide analysis working.
    options.optimization.enabled = false;

    // Update parserOpts to include the absolute path to our application code directory.
    // TODO: Glimmer includes the `src` directory in working trees, while Ember treats
    //       the working tree as the `app` root. This discrepancy is annoying and should
    //       reconciled.
    options.parserOpts.rootDir = rootDir;

    // TODO: Better options validation, this is quick and dirty.
    if (options.output) {
      throw new Error(`CSS Blocks output file names are auto-generated in ${isEmber ? "Ember": "glimmer"} apps. Do not pass an "output" option in your CSS Blocks config.`);
    }
    if (!isEmber && typeof options.entry !== "string" && !Array.isArray(options.entry)) {
      throw new Error("Invalid css-block options in `ember-cli-build.js`: Entry option must be a string or array.");
    }
    if (isEmber && options.entry) {
      throw new Error(`CSS Blocks entry points are auto-discovered in Ember apps. Do not pass an "entry" option in your CSS Blocks config.`);
    }

    return options;
  },

  genTreeWrapper(env, options, prev = NOOP) {
    const { isEmber, app, parent, rootDir, moduleConfig } = env;

    // In Ember, we treat every template as an entry point. `BroccoliCSSBlocks` will
    // automatically discover all template files if an empty entry array is passed.
    const entry = isEmber ? [] : (Array.isArray(options.entry) ? options.entry : [options.entry]);

    // I hate shared memory...
    let transport = new Transport(rootDir);
    this.transports.push(transport);

    let analyzer = new GlimmerAnalyzer(options.parserOpts, options.analysisOpts, moduleConfig);

    const broccoliOptions = {
      entry,
      analyzer,
      transport,
      output: options.output,
      optimization: options.optimization,
    };

    return (tree) => {
      tree = new BroccoliCSSBlocks(tree, broccoliOptions);
      app.trees.styles = new CSSOutput([app.trees.styles, tree], transport);
      return prev.call(parent, tree);
    };
  }
};