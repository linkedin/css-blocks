import funnel = require("broccoli-funnel");
import mergeTrees = require("broccoli-merge-trees");
import type { InputNode } from "broccoli-node-api";
import Filter = require("broccoli-persistent-filter");
import type { PluginOptions } from "broccoli-plugin/dist/interfaces";
import EmberApp from "ember-cli/lib/broccoli/ember-app";
import type Addon from "ember-cli/lib/models/addon";
import type { AddonImplementation, ThisAddon } from "ember-cli/lib/models/addon";
import Project from "ember-cli/lib/models/project";

class CSSBlocksApplicationPlugin extends Filter {
  appName: string;
  constructor(appName: string, inputNodes: InputNode[], options?: PluginOptions) {
    super(mergeTrees(inputNodes), options || {});
    this.appName = appName;
  }
  processString(contents: string, _relativePath: string): string {
    return contents;
  }
  async build() {
    await super.build();
    // console.log(`XXX ${this.appName}`);
    // let entries = this.input.entries(".", {globs: ["**/*"]});
    // for (let entry of entries) {
    //   console.log(entry.relativePath);
    // }
    this.output.writeFileSync(
      `${this.appName}/services/-css-blocks-data.js`,
      `// CSS Blocks Generated Data. DO NOT EDIT.
       export const data = {className: "it-worked"};
      `);
  }
}

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
    let env = this.env!;
    if (type === "js") {
      if (env.isApp) {
        let appAndAddonTree = new CSSBlocksApplicationPlugin(env.modulePrefix, [env.app.addonTree(), tree]);
        return funnel(appAndAddonTree, {srcDir: env.modulePrefix, destDir: env.modulePrefix});
      } else {
        return tree;
      }
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
