'use strict';

const { BroccoliCSSBlocks } = require("@css-blocks/broccoli");
const { GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");
const debugGenerator = require("debug");
const path = require("path");
const Funnel = require("broccoli-funnel");
const Merge = require("broccoli-merge-trees");

const debug = debugGenerator("css-blocks:ember-cli");

const EMBER_MODULE_CONFIG = undefined;
const EMBER_OUTPUT = "styles/css-blocks.css";

const GLIMMER_MODULE_CONFIG = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
GLIMMER_MODULE_CONFIG.types.stylesheet = { definitiveCollection: "components" };
GLIMMER_MODULE_CONFIG.collections.components.types.push("stylesheet");
const GLIMMER_OUTPUT = "src/ui/styles/css-blocks.css";

module.exports = {
  name: 'css-blocks',
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
      analysis = analyzer.analyses().find(a => !!~env.meta.moduleName.indexOf(a.template.path));
    } else {
      analysis = analyzer.analyses().find(a => a.template.identifier === env.meta.specifier);
    }

    // If there is no analysis for this template, don't do anything.
    if (!analysis) {
      debug(`No analysis found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
      return { name: 'css-blocks-noop', visitors: {} };
    }

    // Otherwise, run the rewriter transforms!
    debug(`Generating AST rewriter for "${analysis.template.identifier}"`);
    return new GlimmerRewriter(env.syntax, mapping, analysis);
  },

  setupPreprocessorRegistry(type, registry) {

    if (type !== 'parent') { return; }

    debug(`Registering handlebars AST plugin generators."`);

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
      return `<link rel="stylesheet" href="${config.rootURL || '/'}assets/css-blocks.css">`;
    }
  },

  treeForAddonTemplates() {
    console.log(this.isAddon, arguments);
  },

  included(app) {
    this._super.included.apply(this, arguments);

    // Because we have slightly different logic depending on the app type.
    // TODO: Is there a better way to get env type?
    this.isAddon = !!app.app;
    console.log(this.isAddon);
    console.log(app.trees);
    console.log('=============');
    app = app.app ? app.app : app;
    this.isEmber = !!~app.constructor.name.indexOf("Ember");
    this.isGlimmer = !this.isEmber;

    // TODO: This transport object need to be defined by CSS Blocks Core.
    //       We use the same construct in both Broccoli and Webpack and
    //       the data model for each should be standardized to Analyzers
    //       and Rewriters consistently know how to communicate.
    this.transport = {};

    // TODO: Better options validation.
    let options = app.options["css-blocks"] || {
      parserOpts: {},
      analysisOpts: {},
      optimization: {},
    };
    if (options.output && ((this.isEmber && options.output !== EMBER_OUTPUT) || (this.isGlimmer && options.output !== GLIMMER_OUTPUT))) {
      throw new Error(`CSS Blocks output file names are auto-generated in ${this.isEmber ? "Ember": "glimmer"} apps. Do not pass an "output" option in your CSS Blocks config.`);
    }
    if (!this.isEmber && typeof options.entry !== "string" && !Array.isArray(options.entry)) {
      throw new Error("Invalid css-block options in `ember-cli-build.js`: Entry option must be a string or array.");
    }
    if (this.isEmber && options.entry) {
      throw new Error(`CSS Blocks entry points are auto-discovered in Ember apps. Do not pass an "entry" option in your CSS Blocks config.`);
    }

    // TODO: Module configs are different depending on Glimmer vs Ember.
    // Ideally fetching the module config is baked into ember-cli and we can
    // simply augment a copy of it for our analysis phase since we don't actually
    // deliver any resolvable files, but we need to have our `stylesheet.css`s be
    // resolvable by `glimmer-analyzer` during the build...
    let moduleConfig = this.isGlimmer ? GLIMMER_MODULE_CONFIG : EMBER_MODULE_CONFIG;

    // The absolute path to the root of our app (aka: the directory that contains "src").
    // Needed because app root !== project root in addons – its located at `tests/dummy`.
    // TODO: Is there a better way to get this for Ember?
    let rootDir = this.isEmber
      ? path.join(app.project.root, path.relative(app.project.root, app.project.configPath()), "../..")
      : app.project.root;

    let treeName = this.isEmber ? "app" : "src";

    // Path to the `src` directory, relative to project root.
    let srcDir = path.join(path.relative(app.project.root, rootDir), treeName);
    if (moduleConfig) {
      moduleConfig.app || (moduleConfig.app = {});
      moduleConfig.app.mainPath = srcDir;
    }

    // Update parserOpts to include the absolute path to our `src` directory.
    // Glimmer's trees include the `src` directory, so don't include that.
    options.parserOpts.rootDir = path.join(app.project.root, this.isEmber ? srcDir : path.relative(app.project.root, rootDir));

    // Ember-cli is *mostly* used with Glimmer. However, it can technically be
    // configured to use other template types. Here we default to the Glimmer
    // analyzer, but if a `getAnalyzer` function is provided we defer to the
    // user-supplied analyzer.
    let analyzer = options.getAnalyzer ?
      options.getAnalyzer(app) :
      new GlimmerAnalyzer(rootDir, treeName, moduleConfig, options.parserOpts, options.analysisOpts);

    // Glimmer has opinions yo, no need to specify an output – we got ya.
    options.output = this.isEmber ? EMBER_OUTPUT : GLIMMER_OUTPUT;

    // In Ember, we treat every template as an entry point. `BroccoliCSSBlocks` will
    // automatically discover all template files if an empty entry points array is
    // passed.
    const entries = this.isEmber ? [] : (Array.isArray(options.entry) ? options.entry : [options.entry]);
    if (this.isAddon) { return; }
    // Run our analysis on all entry points.
    app.trees[treeName] = new BroccoliCSSBlocks(app.trees[treeName], {
      entry: entries,
      output: options.output,
      analyzer,
      transport: this.transport, // I hate shared memory...
      optimization: options.optimization,
    });

    // Place our generated CSS files into Glimmer's styles tree.
    // Glimmer splits out its `styles` tree before we get our hands
    // on the project, we need to re-insert all the project-wide
    // work we did in the `src` tree here once we're done for it
    // to be reflected in the final output.
    // TODO: There is probably a cleaner way to do this.
    app.trees.styles = new Merge([app.trees.styles, new Funnel(app.trees[treeName], {
      files: [options.output],
      getDestinationPath: (relPath) => {
        // There is a tree structure difference between Ember and Glimmer...
        return this.isGlimmer ? relPath : "css-blocks.css";
      }
    })], { overwrite: true });

  }
};