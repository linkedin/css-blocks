/* tslint:disable:prefer-unknown-to-any */
import BROCCOLI_FUNNEL from "broccoli-funnel";
import BROCCOLI_MERGE from "broccoli-merge-trees";

import { Addon, EmberAppAddon, IDENTITY } from "./_utils";

function withoutCssBlockFiles(tree: any) {
  if (!tree) return tree;
  return BROCCOLI_FUNNEL(tree, {
    exclude: ["**/*.block.{css,scss,sass,less,styl}"],
  });
}

export function included(this: Addon, parent: EmberAppAddon ) {
  this._super!.included.apply(this, arguments);

  // Engines' children are initialized twice, once by
  // `ember-engines/lib/engine-addon.js`, and once by
  // `ember-cli/lib/models/addon.js`. This feels like
  // a bug in Ember CLI.
  if (this._owners!.has(parent)) { return; }
  this._owners!.add(parent);

  // Fetch information about the environment we're running in.
  let env = this.env = this.getEnv(parent);

  // Fetch and validate user-provided options.
  let options = this._options = this.getOptions(env);

  let isApp = env.app === parent;

  // If the consuming app has explicitly disabled CSS Blocks, exit.
  if (options.disabled) { return; }

  // Determine the aggregate file that we'll be storing Block styles in
  // during the build.
  this.aggregateFile = options.output || (env.isEmber ? `css-blocks.css` : "src/ui/styles/css-blocks.css");

  // In Ember, we need to inject the CSS Blocks runtime helpers. Only do this in
  // the top level addon. `app.import` is not a thing in Glimmer.
  // TODO: Pull in as CJS so we don't need to build @css-blocks/glimmer to CJS *and* AMD.
  //       Blocked by: https://github.com/rwjblue/ember-cli-cjs-transform/issues/72
  if (env.isEmber && isApp) {
    this.outputFile = env.app.options.outputPaths.app.css.app.slice(1);

    env.app.import("node_modules/@css-blocks/glimmer/dist/amd/src/helpers/classnames.js", {
      using: [{ transformation: "amd", as: "@css-blocks/helpers/classnames" }],
      resolveFrom: __dirname,
    });

    env.app.import("node_modules/@css-blocks/glimmer/dist/amd/src/helpers/concat.js", {
      using: [{ transformation: "amd", as: "@css-blocks/helpers/concat" }],
      resolveFrom: __dirname,
    });
  }

  // TODO: Would like to get rid of this, is now only used in `this.astPlugin`.
  this.isEmber = env.isEmber;

  let origTreeForAddonStyles = parent.treeForAddonStyles || IDENTITY;
  parent.treeForAddonStyles = (tree: any) => origTreeForAddonStyles(withoutCssBlockFiles(tree));

  let origTreeForAppStyles = parent.treeForAppStyles || IDENTITY;
  parent.treeForAppStyles = (tree: any) => origTreeForAppStyles(withoutCssBlockFiles(tree));

  // Remove all CSS Block files before preprocessing occurs. We assume the
  // preprocessing they're doing is for any non-css-block css files they might
  // have. There is a CSS Blocks configuration for adding css preprocessing
  // before css blocks parsing occurs.
  let origPreprocessTree = parent.preprocessTree || ((_type: string, tree: any): any => tree);
  parent.preprocessTree = (type: string, tree: any) => origPreprocessTree(type, type === "css" ? withoutCssBlockFiles(tree) : tree);

  // Analyze all templates and block files from `/app` in addons.
  parent.treeForApp = this.genTreeWrapper(env, options, "addonApp", parent.treeForApp);

  // Analyze all templates and block files from `/addon` in addons.
  parent.treeForAddon = this.genTreeWrapper(env, options, "addon", parent.treeForAddon);

  // Analyze all templates and block files from `/app` in Ember apps.
  // Analyze all templates and block files from `/src` in Glimmer apps.
  if (parent.trees) {
    let treeName = env.isEmber ? "app" : "src";
    let tree = parent.trees[treeName];
    if (!env.isEmber) {
      // Glimmer apps use the glimmer dependency analyzer which expects to find
      // the package.json file for the project in the tree that also includes the app's
      // src directory
      let packageJsonTree = BROCCOLI_FUNNEL(env.rootDir, {include: ["package.json"]});
      tree = BROCCOLI_MERGE([tree, packageJsonTree]);
    }
    parent.trees[treeName] = this.genTreeWrapper(env, options, "app")(tree);
  }

}
