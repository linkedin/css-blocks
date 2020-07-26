import * as config from "@css-blocks/config";
import { NodeJsImporter, Options as ParserOptions, OutputMode } from "@css-blocks/core";
import type { ASTPlugin } from "@glimmer/syntax";
import { ObjectDictionary } from "@opticss/util";
import BroccoliDebug = require("broccoli-debug");
import funnel = require("broccoli-funnel");
import type { InputNode } from "broccoli-node-api";
import debugGenerator from "debug";
import TemplateCompilerPlugin = require("ember-cli-htmlbars/lib/template-compiler-plugin");
import type EmberApp from "ember-cli/lib/broccoli/ember-app";
import type EmberAddon from "ember-cli/lib/models/addon";
import type { AddonImplementation, ThisAddon, Tree } from "ember-cli/lib/models/addon";
import type Project from "ember-cli/lib/models/project";

import { BLOCK_GLOB, CSSBlocksEmberOptions, CSSBlocksTemplateCompilerPlugin, EmberASTPluginEnvironment } from "./CSSBlocksTemplateCompilerPlugin";

const debug = debugGenerator("css-blocks:ember");

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function withoutCssBlockFiles(tree: InputNode | undefined) {
  if (!tree) return tree;
  return funnel(tree, {
    exclude: [ BLOCK_GLOB ],
  });
}

/**
 * The options that can be passed for css blocks to an ember-cli application.
 */
export interface CSSBlocksEmberAppOptions {
  "css-blocks"?: CSSBlocksEmberOptions;
}

interface CSSBlocksAddon {
  templateCompiler?: CSSBlocksTemplateCompilerPlugin;
  findSiblingAddon<AddonType>(this: ThisAddon<CSSBlocksAddon>, name: string): ThisAddon<AddonType> | undefined;
  getOptions(this: ThisAddon<CSSBlocksAddon>): CSSBlocksEmberOptions;
  optionsForCacheInvalidation(this: ThisAddon<CSSBlocksAddon>): ObjectDictionary<unknown>;
  astPluginBuilder(env: EmberASTPluginEnvironment): ASTPlugin;
  _options?: CSSBlocksEmberOptions;
}
interface HTMLBarsAddon {
  transpileTree(inputTree: Tree, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions): TemplateCompilerPlugin;
}

function isAddon(parent: EmberAddon | EmberApp | Project): parent is EmberAddon {
  return !!parent["findOwnAddonByName"];
}

const EMBER_ADDON: AddonImplementation<CSSBlocksAddon> = {
  name: "@css-blocks/ember",

  init(parent, project) {
    this._super.init.call(this, parent, project);
    this.treePaths.app = "../runtime/app";
    this.treePaths.addon = "../runtime/addon";
  },

  findSiblingAddon(name) {
    if (isAddon(this.parent)) {
      return this.parent.findOwnAddonByName(name);
    } else {
      return this.project.findAddonByName(name);
    }
  },

  included(parent) {
    this._super.included.apply(this, [parent]);
    this.app = this._findHost();
    let parentName = typeof parent.name === "string" ? parent.name : parent.name();
    debug(`@css-blocks/ember included into ${parentName}`);
    this._options = this.getOptions();
    let htmlBarsAddon = this.findSiblingAddon<HTMLBarsAddon>("ember-cli-htmlbars");
    if (!htmlBarsAddon) {
      throw new Error(`Using @css-blocks/ember on ${parentName} also requires ember-cli-htmlbars to be an addon for ${parentName} (ember-cli-htmlbars should be a dependency in package.json, not a devDependency)`);
    }
    if (!htmlBarsAddon.transpileTree) {
      throw new Error(`Version ${htmlBarsAddon.pkg.version} of ember-cli-htmlbars for ${parentName} is not compatible with @css-blocks/ember. Please upgrade to ^5.2.0.`);
    }
    htmlBarsAddon.transpileTree = (inputTree: Tree, htmlbarsOptions: TemplateCompilerPlugin.HtmlBarsOptions) => {
      debug(`transpileTree for ${parentName} was called.`);
      this.templateCompiler = new CSSBlocksTemplateCompilerPlugin(inputTree, parentName, htmlbarsOptions, this._options!);
      return this.templateCompiler;
    };
  },

  astPluginBuilder(env) {
    return this.templateCompiler!.astPluginBuilder(env);
  },

  preprocessTree(type, tree) {
    if (type !== "css") return tree;
    // We compile CSS Block files in the template tree, so in the CSS Tree all
    // we need to do is prune them out of the build before the tree gets
    // built.
    return withoutCssBlockFiles(tree);
  },

  postprocessTree(type, tree) {
    if (type !== "template") return tree;
    tree = withoutCssBlockFiles(tree);
    let parentName = typeof this.parent.name === "string" ? this.parent.name : this.parent.name();
    let isAddon = typeof this.parent.name === "string";
    return new BroccoliDebug(tree, `css-blocks:template-output:${parentName}:${isAddon ? "addon" : "app"}`);
  },

  setupPreprocessorRegistry(type, registry) {
    if (type !== "parent") { return; }
    // For Ember
    registry.add("htmlbars-ast-plugin", {
      name: "css-blocks-htmlbars",
      // TODO: parallel babel stuff
      plugin: this.astPluginBuilder.bind(this),
      // This is turned off to work around a bug in broccoli-persistent-filter.
      dependencyInvalidation: false,
      cacheKey: () => this.optionsForCacheInvalidation(),
      baseDir: () => __dirname,
    });
  },

  getOptions() {
    let app = this.app!;
    let root = app.project.root;
    let appOptions = app.options;

    if (!appOptions["css-blocks"]) {
      appOptions["css-blocks"] = {};
    }

    // Get CSS Blocks options provided by the application, if present.
    const options = <CSSBlocksEmberOptions>appOptions["css-blocks"]; // Do not clone! Contains non-json-safe data.
    if (!options.aliases) options.aliases = {};
    if (!options.analysisOpts) options.analysisOpts = {};
    if (!options.optimization) options.optimization = {};

    if (!options.parserOpts) {
      options.parserOpts = config.searchSync(root) || {};
    }

    // Use the node importer by default.
    options.parserOpts.importer = options.parserOpts.importer || new NodeJsImporter(options.aliases);

    // Optimization is always disabled for now, until we get project-wide analysis working.
    if (typeof options.optimization.enabled === "undefined") {
      options.optimization.enabled = app.isProduction;
    }

    // Update parserOpts to include the absolute path to our application code directory.
    if (!options.parserOpts.rootDir) {
      options.parserOpts.rootDir = root;
    }
    options.parserOpts.outputMode = OutputMode.BEM_UNIQUE;

    if (options.output !== undefined && typeof options.output !== "string") {
      throw new Error(`Invalid css-blocks options in 'ember-cli-build.js': Output must be a string. Instead received ${options.output}.`);
    }
    return options;
  },

  optionsForCacheInvalidation() {
    let aliases = this._options!.aliases;
    let analysisOpts = this._options!.analysisOpts;
    let optimization = this._options!.optimization;
    let parserOpts: Writeable<ParserOptions> & {importerName?: string} = {};
    Object.assign(parserOpts, this._options!.parserOpts);
    let constructor = parserOpts.importer && parserOpts.importer.constructor;
    parserOpts.importerName = constructor && constructor.name;

    return {
      aliases,
      analysisOpts,
      optimization,
      parserOpts,
    };
  },
};

module.exports = EMBER_ADDON;
