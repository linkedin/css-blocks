import BroccoliDebug = require("broccoli-debug");
import funnel = require("broccoli-funnel");
import mergeTrees = require("broccoli-merge-trees");
import EmberApp from "ember-cli/lib/broccoli/ember-app";
import type Addon from "ember-cli/lib/models/addon";
import type { AddonImplementation, ThisAddon } from "ember-cli/lib/models/addon";
import Project from "ember-cli/lib/models/project";

import { CSSBlocksApplicationPlugin, CSSBlocksStylesProcessorPlugin } from "./brocolli-plugin";

interface AddonEnvironment {
  parent: Addon | EmberApp;
  app: EmberApp;
  rootDir: string;
  isApp: boolean;
  modulePrefix: string;
}

interface CSSBlocksApplicationAddon {
  _modulePrefix(): string;
  env: AddonEnvironment | undefined;
  getEnv(parent): AddonEnvironment;
  broccoliAppPluginInstance: CSSBlocksApplicationPlugin | undefined;
}

/**
 * An ember-cli addon for Ember applications using CSS Blocks in its
 * application code. This addon should be a dependency in Ember applications.
 *
 * This addon is responsible for bundling together all CSS Blocks content
 * from the application, concatenating it into a final artifact, and
 * optimizing its content using OptiCSS. Additionally, this addon generates a
 * JSON bundle that contains runtime data that templates need to resolve
 * what classes to add to each CSS Blocks-powered component. And, finally,
 * this addon provides a runtime helper to actually write out those classes.
 *
 * This addon expects that all intermediary blocks have already been compiled
 * into their respective Compiled CSS and Definition Files using the
 * @css-blocks/ember addon. Your app should also include this as a dependency,
 * or else this addon won't generate any CSS output!
 *
 * A friendly refresher for those that might've missed this tidbit from
 * @css-blocks/ember... CSS Blocks actually compiles its CSS as part of the
 * Template tree, not the styles tree! This is because CSS Blocks is unique
 * in how it reasons about both your templates and styles together. So, in order
 * to actually reason about both, and, in turn, rewrite your templates for you,
 * both have to be processed when building templates.
 *
 * You can read more about CSS Blocks at...
 * css-blocks.com
 *
 * And you can read up on the Ember build pipeline for CSS Blocks at...
 * <LINK_TBD>
 *
 * @todo: Provide a link for Ember build pipeline readme.
 */
const EMBER_ADDON: AddonImplementation<CSSBlocksApplicationAddon> = {
  /**
   * The name of this addon. Generally matches the package name in package.json.
   */
  name: "@css-blocks/ember-app",

  env: undefined,

  /**
   * The instance of the CSSBlocksApplicationPlugin. This instance is
   * generated during the JS tree and is needed for the CSS tree.
   */
  broccoliAppPluginInstance: undefined,

  /**
   * Initalizes this addon instance for use.
   * @param parent - The project or addon that directly depends on this addon.
   * @param project - The current project (deprecated).
   */
  init(parent, project) {
    // We must call this._super or weird stuff happens. The Ember CLI docs
    // recommend guarding this call, so we're gonna ask TSLint to chill.
    // tslint:disable-next-line: no-unused-expression
    this._super.init && this._super.init.call(this, parent, project);
    this.treePaths.app = "../runtime/app";
    this.treePaths.addon = "../runtime/addon";
  },

  _modulePrefix(): string {
    /// @ts-ignore
    const parent = this.parent;
    const config = typeof parent.config === "function" ? parent.config() || {} : {};
    const name = typeof parent.name === "function" ? parent.name() : parent.name;
    const moduleName = typeof parent.moduleName === "function" ? parent.moduleName() : parent.moduleName;
    return moduleName || parent.modulePrefix || config.modulePrefix || name || "";
  },

  getEnv(this: ThisAddon<CSSBlocksApplicationAddon>, parent: Addon | EmberApp): AddonEnvironment {
    // Fetch a reference to the parent app
    let current: Addon | Project = this;
    let app: EmberApp | undefined;
    do { app = (<Addon>current).app || app; }
    while ((<Addon>(<Addon>current).parent).parent && (current = (<Addon>current).parent));

    let isApp = parent === app;

    // The absolute path to the root of our app (aka: the directory that contains "src").
    // Needed because app root !== project root in addons – its located at `tests/dummy`.
    // TODO: Is there a better way to get this for Ember?
    let rootDir = (<Addon>parent).root || (<EmberApp>parent).project.root;

    let modulePrefix = this._modulePrefix();

    return {
      parent,
      app: app!,
      rootDir,
      isApp,
      modulePrefix,
    };
  },

  /**
   * This method is called when the addon is included in a build. You would typically
   * use this hook to perform additional imports.
   * @param parent - The parent addon or application this addon is currently working on.
   */
  included(parent) {
    // We must call this._super or weird stuff happens.
    this._super.included.apply(this, [parent]);
    this.env = this.getEnv(parent);
  },

  /**
   * Pre-process a tree. Used for adding/removing files from the build.
   * @param type - What kind of tree.
   * @param tree - The tree that's to be processed.
   * @returns - A tree that's ready to process.
   */
  preprocessTree(type, tree) {
    // tslint:disable-next-line:prefer-unknown-to-any
    let env = this.env!;

    if (type === "js") {
      if (env.isApp) {
        let lazyAddons = this.project.addons.filter((a: any) => a.lazyLoading && a.lazyLoading.enabled === true);
        let jsOutputTrees = lazyAddons.map((a) => {
          // this isn't tenable *at all*
          let publicTree = (<any>a).treeForPublic();
          let jsTree = publicTree.inputNodes[publicTree.inputNodes.length - 1];
          let blocksOutputTree = jsTree._inputNodes[0]._inputNodes[0]._inputNodes[0]._inputNodes[0]._inputNodes[0]._inputNodes[0];
          return blocksOutputTree;
        });
        let lazyOutput = funnel(mergeTrees(jsOutputTrees), {destDir: "lazy-tree-output"});
        this.broccoliAppPluginInstance = new CSSBlocksApplicationPlugin(env.modulePrefix, [env.app.addonTree(), tree, lazyOutput], {});
        let debugTree = new BroccoliDebug(this.broccoliAppPluginInstance, `css-blocks:optimized`);
        return funnel(debugTree, {srcDir: env.modulePrefix, destDir: env.modulePrefix});
      } else {
        return tree;
      }
    } else if (type === "css") {
      // We can't do much if we don't have the result from CSSBlocksApplicationPlugin.
      // This should never happen because the JS tree is processed before the CSS tree,
      // but just in case....
      if (!env.isApp) {
        return tree;
      }
      if (!this.broccoliAppPluginInstance) {
        throw new Error("[css-blocks/ember-app] The CSS tree ran before the JS tree, so the CSS tree doesn't have the contents for CSS Blocks files. This shouldn't ever happen, but if it does, please file an issue with us!");
      }
      // Get the combined CSS file
      const cssBlocksContentsTree = new CSSBlocksStylesProcessorPlugin([this.broccoliAppPluginInstance, tree]);
      return new BroccoliDebug(mergeTrees([tree, cssBlocksContentsTree], { overwrite: true }), "css-blocks:css-preprocess");
    } else {
      return tree;
    }
  },

  /**
   * Post-process a tree. Runs after the files in this tree have been built.
   * @param type - What kind of tree.
   * @param tree  - The processed tree.
   * @returns - The processed tree.
   */
  postprocessTree(type, tree) {
    if (type !== "template") return tree;

    // TODO: Do something in the template tree.
    return tree;
  },

  /**
   * Used to add preprocessors to the preprocessor registry. This is often used
   * by addons like ember-cli-htmlbars and ember-cli-coffeescript to add a
   * template or js preprocessor to the registry.
   * @param _type - Either "self" or "parent".
   * @param _registry - The registry to be set up.
   */
  setupPreprocessorRegistry(_type, _registry) {
    // TODO: This hook may not be necessary in this addon.
  },
};

// Aaaaand export the addon implementation!
module.exports = EMBER_ADDON;
