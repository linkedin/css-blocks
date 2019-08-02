'use strict';
const path = require("path");

const { CSSBlocksAggregate, CSSBlocksAnalyze, Transport } = require("@css-blocks/broccoli");
const { GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");
const { NodeJsImporter } = require("@css-blocks/core");

const BroccoliConcat = require("broccoli-concat");
const BroccoliMerge = require("broccoli-merge-trees");

const debugGenerator = require("debug");

const DEBUG = debugGenerator("css-blocks:ember-cli");

const EMBER_MODULE_CONFIG = undefined;
const GLIMMER_MODULE_CONFIG = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
GLIMMER_MODULE_CONFIG.types.stylesheet = { definitiveCollection: "components" };
GLIMMER_MODULE_CONFIG.collections.components.types.push("stylesheet");

// Default tree hook no-op function.
const NOOP = (tree) => tree;

// Default no-op plugin for templates with no associated CSS Block.
// `visitors` is used by Ember < 3.0.0. `visitor` is used by Glimmer and Ember >= 3.0.0.
const NOOP_PLUGIN = {
  name: 'css-blocks-noop',
  visitors: {},
  visitor: {},
  cacheKey: () => { return 1; }
};

module.exports = {
  name: '@css-blocks/ember-cli',
  outputFile: 'app.css',
  aggregateFile: 'css-blocks.css',
  isDevelopingAddon() { return true; },
  transports: new Map(),
  _owners: new Set(),

  _modulePrefix() {
    const parent = this.parent;
    const config = typeof parent.config === "function" ? parent.config() || {} : {};
    const name = typeof parent.name === "function" ? parent.name() : parent.name;
    const moduleName = typeof parent.moduleName === "function" ? parent.moduleName() : parent.moduleName;
    return moduleName || parent.modulePrefix || config.modulePrefix || name || "";
  },

  // Shared AST plugin implementation for Glimmer and Ember.
  astPlugin(env) {

    let modulePrefix = this._modulePrefix();
    let transport = this.transports.get(this.parent);

    // If there is no analyzer or mapping for this template in the transport, don't do anything.
    if (!transport) {
      DEBUG(`No transport object found found for "${modulePrefix}". Skipping rewrite.`);
      return NOOP_PLUGIN;
    }

    // Woo, shared memory wormhole!...
    let { analyzer, mapping } = transport;

    // If there is no analyzer or mapping for this template in the transport, don't do anything.
    if (!analyzer || !mapping) {
      DEBUG(`No mapping object found found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
      return NOOP_PLUGIN;
    }

    // If no specifier data for this template, pass through silently.
    if (!env.meta.moduleName && !env.meta.specifier) {
      return NOOP_PLUGIN;
    }

    // TODO: Write a better `getAnalysis` method on `Analyzer`
    // TODO: The differences in what Ember and Glimmer provide in env.meta should be resolved.
    let analysis;
    if (this.isEmber) {
      analysis = analyzer.analyses().find(a => env.meta.moduleName === path.join(modulePrefix, a.template.identifier));
    } else {
      analysis = analyzer.analyses().find(a => env.meta.specifier === a.template.identifier);
    }

    // If there is no analysis for this template in any of the transports, don't do anything.
    if (!analysis) {
      DEBUG(`No analysis found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
      return NOOP_PLUGIN;
    }

    // If we do have a matching analysis, run the rewriter transforms!
    DEBUG(`Generating AST rewriter for "${analysis.template.identifier}"`);
    return new GlimmerRewriter(env.syntax, mapping, analysis, this._options.parserOpts);

  },

  setupPreprocessorRegistry(type, registry) {

    if (type !== 'parent') { return; }

    DEBUG(`Registering handlebars AST plugin generators."`);

    // For Ember
    registry.add("htmlbars-ast-plugin", {
      name: "css-blocks-htmlbars",
      plugin: this.astPlugin.bind(this),
      // cacheKey: () => {
      //   return this.transports.get(this.parent).mapping;
      // }
    });

    // For Glimmer
    registry.add("glimmer-ast-plugin", this.astPlugin.bind(this));
  },

  // TODO: This seems broken in Ember-CLI and should be fixed there.
  // In-repo addons of dummy apps that must depend on the addon that
  // contain it result in an infinite constructor loop. In order to
  // test in-app addon integration in this addon, we must explicitly
  // remote our dependency on the in-repo dummy addon. Not sure why
  // Ember-cli adds the in-repo dummy addon as a child of the main
  // addon...
  discoverAddons(){
    this._super.discoverAddons.apply(this, arguments);
    delete this.addonPackages["in-repo-addon"];
    delete this.addonPackages["in-repo-engine"];
    delete this.addonPackages["in-repo-lazy-engine"];
  },

  included(parent) {
    this._super.included.apply(this, arguments);

    // Engines' children are initialized twice, once by
    // `ember-engines/lib/engine-addon.js`, and once by
    // `ember-cli/lib/models/addon.js`. This feels like
    // a bug in Ember CLI.
    if (this._owners.has(parent)) { return; }
    this._owners.add(parent);

    // Fetch information about the environment we're running in.
    let env = this.env = this.getEnv(parent);

    // Fetch and validate user-provided options.
    let options = this._options = this.getOptions(env);

    // If the consuming app has explicitly disabled CSS Blocks, exit.
    if (options.disabled) { return; }

    // Determine the aggregate file that we'll be storing Block styles in
    // during the build.
    this.aggregateFile = options.output || (env.isEmber ? `css-blocks.css` : "src/ui/styles/css-blocks.css");

    // In Ember, we need to inject the CSS Blocks runtime helpers. Only do this in
    // the top level addon. `app.import` is not a thing in Glimmer.
    // TODO: Pull in as CJS so we don't need to build @css-blocks/glimmer to CJS *and* AMD.
    //       Blocked by: https://github.com/rwjblue/ember-cli-cjs-transform/issues/72
    if (env.isEmber && env.app === parent) {
      this.outputFile = env.app.options.outputPaths.app.css.app.slice(1);

      env.app.import('node_modules/@css-blocks/glimmer/dist/amd/src/helpers/classnames.js', {
        using: [{ transformation: 'amd', as: '@css-blocks/helpers/classnames' }],
        resolveFrom: __dirname,
      });

      env.app.import('node_modules/@css-blocks/glimmer/dist/amd/src/helpers/concat.js', {
        using: [{ transformation: 'amd', as: '@css-blocks/helpers/concat' }],
        resolveFrom: __dirname,
      });
    }

    // TODO: Would like to get rid of this, is now only used in `this.astPlugin`.
    this.isEmber = env.isEmber;

    // Addons sacrifice the ability to deliver styles in any other way when they
    // opt-in to CSS Blocks. This is in part because of a bug(?) in Ember CLI
    // where the Styles tree is automagically included in vendor.css, without
    // respecting CSS files pruned out during the `treeForAddon` hook.
    // TODO: Fix that. https://github.com/ember-cli/ember-cli/blob/18af95f93f224961ee4f4a35af461683059b194f/lib/models/addon.js#L856
    parent.treeForAddonStyles = () => undefined;

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

  // At the very end of the build, append our CSS Blocks aggregate file to
  // the main `app.css` file. Un-link the destination file first to make sure
  // we don't modify the source file if broccoli sym-linked it all the way back.
  postprocessTree(name, tree) {

    const aggregatorTree = this.env.app.trees.cssblocks;

    // If this is not the root app, or the css tree, no-op.
    if (this.env.isAddon || name !== 'css' || !aggregatorTree) { return tree; }

    DEBUG(`Writing all CSS Blocks output to "${this.outputFile}".`);
    let merged = new BroccoliMerge([tree, aggregatorTree], { overwrite: true })
    merged = new BroccoliConcat(merged, {
      outputFile: this.outputFile,
      inputFiles: [ this.outputFile, this.aggregateFile ],
      allowNone: true,
    });

    return new BroccoliMerge([tree, merged], { overwrite: true });
  },

  getEnv(parent){

    // Fetch a reference to the parent app
    let current = this, app;
    do { app = current.app || app; }
    while (current.parent.parent && (current = current.parent));

    // The absolute path to the root of our app (aka: the directory that contains "src").
    // Needed because app root !== project root in addons – its located at `tests/dummy`.
    // TODO: Is there a better way to get this for Ember?
    let rootDir = parent.root || parent.project.root;

    // Because we have slightly different logic depending on the app type.
    // TODO: Is there a better way to get this env info?
    let isEmber = !!(app.registry && app.registry.availablePlugins && app.registry.availablePlugins["ember-source"]);
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

    let modulePrefix = this._modulePrefix();

    return {
      parent,  app,
      rootDir, isEmber,
      isAddon, isGlimmer,
      moduleConfig, modulePrefix,
    };
  },

  getOptions(env) {

    let { isEmber, app, rootDir } = env;

    // Get CSS Blocks options provided by the application, if present.
    const options = app.options["css-blocks"]
      ? app.options["css-blocks"] // Do not clone! Contains non-json-safe data.
      : {
        aliases: {},
        parserOpts: {},
        analysisOpts: {},
        optimization: {},
      };
    options.aliases      || (options.aliases = {});
    options.analysisOpts || (options.analysisOpts = {});
    options.optimization || (options.optimization = {});
    options.parserOpts   || (options.parserOpts = {
      importer: new NodeJsImporter(options.aliases),
    });

    // Optimization is always disabled for now, until we get project-wide analysis working.
    options.optimization.enabled = false;

    // Update parserOpts to include the absolute path to our application code directory.
    options.parserOpts.rootDir = rootDir;
    options.parserOpts.outputMode = "BEM_UNIQUE";


    if (options.output !== undefined && typeof options.output !== "string") {
      throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Output must be a string or array. Instead received ${options.output}.`);
    }
    if (!isEmber && typeof options.entry !== "string" && !Array.isArray(options.entry)) {
      throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Entry must be a string or array. Instead received ${options.entry}.`);
    }
    if (isEmber && options.entry) {
      throw new Error(`CSS Blocks entry points are auto-discovered in Ember apps. Do not pass an "entry" option in your CSS Blocks config.`);
    }

    return options;
  },

  genTreeWrapper(env, options, prev = NOOP) {
    const { isEmber, app, parent, rootDir, moduleConfig, modulePrefix } = env;

    // In Ember, we treat every template as an entry point. `BroccoliCSSBlocks` will
    // automatically discover all template files if an empty entry array is passed.
    const entry = isEmber ? [] : (Array.isArray(options.entry) ? options.entry : [options.entry]);

    // I hate shared memory...
    let transport = new Transport(modulePrefix);
    this.transports.set(this.parent, transport);
    DEBUG(`Created transport object for ${modulePrefix}`);

    let analyzer = new GlimmerAnalyzer(options.parserOpts, options.analysisOpts, moduleConfig);
    analyzer.transport = transport;

    const broccoliOptions = {
      analyzer,
      entry,
      output: options.output,
      optimization: options.optimization,
      root: rootDir,
    };

    return (tree) => {
      if (!tree) { return prev.call(parent, tree); }
      tree = new CSSBlocksAnalyze(tree, transport, broccoliOptions);
      app.trees.cssblocks = new CSSBlocksAggregate([app.trees.cssblocks || app.trees.styles, tree], transport, this.aggregateFile);

      // Mad hax for Engines <=0.5.20  support 💩 Right now, engines will throw away the
      // tree passed to `treeForAddon` and re-generate it. In order for template rewriting
      // to happen *after* analysis, we need to overwrite the addon tree on the Engine and
      // clear the template files cache. This cache is seeded during parent app's
      // initialization of the engine in `this.jshintAddonTree()`.
      if (prev.length < 1) {
        parent.options && parent.options.trees && (parent.options.trees.addon = tree);
        parent._cachedAddonTemplateFiles = undefined;
      }

      return prev.call(parent, tree);
    };
  }
};