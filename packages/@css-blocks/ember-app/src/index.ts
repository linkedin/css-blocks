import type { AddonImplementation } from "ember-cli/lib/models/addon";

/**
 * An ember-cli addon for Ember applications using CSS Blocks in its
 * application code. This addon should be a dependency in Ember applications.
 *
 * This addon is responsible for bundling together all CSS Blocks content
 * from the application, concatenating it into a final artifact, and
 * optimizing its content using OptiCSS. Additionaly, this addon generates a
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
const EMBER_ADDON: AddonImplementation = {
  /**
   * The name of this addon. Generally matches the package name in package.json.
   */
  name: "@css-blocks/ember-app",

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
  },

  /**
   * This method is called when the addon is included in a build. You would typically
   * use this hook to perform additional imports.
   * @param parent - The parent addon or application this addon is currently working on.
   */
  included(parent) {
    // We must call this._super or weird stuff happens.
    this._super.included.apply(this, [parent]);
  },

  /**
   * Pre-process a tree. Used for adding/removing files from the build.
   * @param type - What kind of tree.
   * @param tree - The tree that's to be processed.
   * @returns - A tree that's ready to process.
   */
  preprocessTree(type, tree) {
    if (type !== "template") return tree;

    // TODO: Do something in the template tree.
    return tree;
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
