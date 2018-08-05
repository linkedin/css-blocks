'use strict';

const { BroccoliCSSBlocks } = require("@css-blocks/broccoli");
const { GlimmerAnalyzer, GlimmerRewriter } = require("@css-blocks/glimmer");

const Plugin = require("broccoli-plugin");
const debugGenerator = require("debug");
const fs = require("fs-extra");
const path = require("path");

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
    this.reset();
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
class CSSOutput extends Plugin {
  constructor(inputNodes, transport, out) {
    super(inputNodes, { name: "broccoli-css-blocks-aggregator" });
    this.transport = transport;
    this.out = out;
  }

  build() {
    let prev = path.join(this.inputPaths[0], this.out);
    let out = path.join(this.outputPath, this.out);
    let old = fs.existsSync(prev) ? fs.readFileSync(prev) : "";
    fs.ensureFileSync(out);
    fs.writeFileSync(out, `${old}\n\n/* CSS Blocks Start */\n\n${this.transport.css}\n/* CSS Blocks End */\n`);
    this.transport.reset();
  }
}

module.exports = {
  name: '@css-blocks/ember-cli',
  isDevelopingAddon() { return true; },
  transports: new Map(),
  _owners: new Set(),

  _modulePrefix() {
    let parent = this.parent;
    let config = typeof parent.config === "function" ? parent.config() || {} : {};
    let name = typeof parent.name === "function" ? parent.name() : parent.name;
    return parent.modulePrefix || config.modulePrefix || name || "";
  },

  // Shared AST plugin implementation for Glimmer and Ember.
  astPlugin(env) {

    let modulePrefix = this._modulePrefix();
    let transport = this.transports.get(this.parent);

    // If there is no analyzer or mapping for this template in the transport, don't do anything.
    if (!transport) {
      DEBUG(`No transport object found found for "${modulePrefix}". Skipping rewrite.`);
      return { name: 'css-blocks-noop', visitors: {} };
    }

    // Woo, shared memory wormhole!...
    let { analyzer, mapping } = transport;

    // If there is no analyzer or mapping for this template in the transport, don't do anything.
    if (!analyzer || !mapping) {
      DEBUG(`No mapping object found found for template "${env.meta.moduleName || env.meta.specifier}". Skipping rewrite.`);
      return { name: 'css-blocks-noop', visitors: {} };
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
      return { name: 'css-blocks-noop', visitors: {} };
    }

    // If we do have a matching analysis, run the rewriter transforms!
    DEBUG(`Generating AST rewriter for "${analysis.template.identifier}"`);
    return new GlimmerRewriter(env.syntax, mapping, analysis, this.options.parserOpts);

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
    let env = this.getEnv(parent);

    // Fetch and validate user-provided options.
    let options = this.options = this.getOptions(env);

    // In Ember, we need to inject the CSS Blocks runtime helpers. Only do this in
    // the top level addon. `app.import` is not a thing in Glimmer.
    // TODO: Pull in as CJS so we don't need to build @css-blocks/glimmer to CJS *and* AMD.
    //       Blocked by: https://github.com/rwjblue/ember-cli-cjs-transform/issues/72
    if (env.isEmber && env.app === parent) {
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
      ? JSON.parse(JSON.stringify(app.options["css-blocks"]))
      : {
        parserOpts: {},
        analysisOpts: {},
        optimization: {},
      };

    // Optimization is always disabled for now, until we get project-wide analysis working.
    options.optimization.enabled = false;

    // Update parserOpts to include the absolute path to our application code directory.
    options.parserOpts.rootDir = rootDir;
    options.parserOpts.outputMode = "BEM_UNIQUE";

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
    const { isEmber, app, parent, rootDir, moduleConfig, modulePrefix } = env;
    const outputPath = isEmber ? "app.css" : "src/ui/styles/app.css";

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
      entry,
      analyzer,
      transport,
      root: rootDir,
      output: options.output,
      optimization: options.optimization,
    };

    return (tree) => {
      if (!tree) { return prev.call(parent, tree); }
      tree = new BroccoliCSSBlocks(tree, broccoliOptions);
      app.trees.styles = new CSSOutput([app.trees.styles, tree], transport, outputPath);

      // Mad hax for Engines support 💩 Right now, engines will throw away the tree passed
      // to `treeForAddon` and re-generate it. In order for template rewriting to happen
      // *after* analysis, we need to overwrite the addon tree on the Engine and clear
      // the template files cache. This cache is seeded during parent app's initialization
      // of the engine in `this.jshintAddonTree()`.
      parent.options && parent.options.trees && (parent.options.trees.addon = tree);
      parent._cachedAddonTemplateFiles = undefined;

      return prev.call(parent, tree);
    };
  }
};