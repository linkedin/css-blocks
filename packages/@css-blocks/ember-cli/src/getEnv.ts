
import GLIMMER_MODULE_CONFIG from "@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js";
import { PackageDefinition } from "@glimmer/resolver";

import { Addon, EmberAppAddon, Env, GlimmerModuleConfig } from "./_utils";

(GLIMMER_MODULE_CONFIG as GlimmerModuleConfig).types.stylesheet = { definitiveCollection: "components" };
GLIMMER_MODULE_CONFIG.collections.components.types.push("stylesheet");

const EMBER_MODULE_CONFIG = undefined;

export function getEnv(this: Addon, parent: EmberAppAddon): Env {
  // Fetch a reference to the parent app
  let current: Addon | EmberAppAddon = this;
  let app: EmberAppAddon | undefined;
  do {
    if (current.app) {
      app = current.app;
    } else if (app !== undefined) {

    }
    app = current.app || app;
  } while (current.parent && current.parent.parent && (current = current.parent));

  // The absolute path to the root of our app (aka: the directory that contains "src").
  // Needed because app root !== project root in addons – its located at `tests/dummy`.
  // TODO: Is there a better way to get this for Ember?
  let rootDir = parent.root || (parent.project && parent.project.root);

  // Because we have slightly different logic depending on the app type.
  // TODO: Is there a better way to get this env info?
  let isEmber = !!(app && app.registry && app.registry.availablePlugins && app.registry.availablePlugins["ember-source"]);
  let isAddon = isEmber && !~parent.constructor.name.indexOf("Ember");
  let isGlimmer = !isEmber;

  // TODO: Module configs are different depending on Glimmer vs Ember.
  //       Ideally fetching the module config is baked into ember-cli and we can
  //       simply augment a copy of it for our analysis phase since we don't actually
  //       deliver any resolvable files, but we need to have our `stylesheet.css`s be
  //       resolvable by `glimmer-analyzer` during the build...
  let moduleConfig = (isGlimmer ? GLIMMER_MODULE_CONFIG : EMBER_MODULE_CONFIG) as GlimmerModuleConfig;
  if (moduleConfig) {
    moduleConfig.app = moduleConfig.app || ({} as PackageDefinition);
    moduleConfig.app.mainPath = "src";
  }

  let modulePrefix = this._modulePrefix();

  return {
    parent,  app: (app as EmberAppAddon),
    rootDir, isEmber,
    isAddon, isGlimmer,
    moduleConfig, modulePrefix,
  };
}
