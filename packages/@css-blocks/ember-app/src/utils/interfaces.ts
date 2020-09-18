import { ResolvedCSSBlocksEmberOptions } from "@css-blocks/ember-utils";
import EmberApp from "ember-cli/lib/broccoli/ember-app";
import type Addon from "ember-cli/lib/models/addon";

import { CSSBlocksApplicationPlugin } from "../broccoli-plugin";

export interface AddonEnvironment {
  parent: Addon | EmberApp;
  app: EmberApp;
  rootDir: string;
  isApp: boolean;
  modulePrefix: string;
  config: ResolvedCSSBlocksEmberOptions;
}

export interface CSSBlocksApplicationAddon {
  _modulePrefix(): string;
  env: AddonEnvironment | undefined;
  getEnv(parent): AddonEnvironment;
  broccoliAppPluginInstance: CSSBlocksApplicationPlugin | undefined;
}
