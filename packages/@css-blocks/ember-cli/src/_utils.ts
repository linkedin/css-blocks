/* tslint:disable:prefer-unknown-to-any */
import debugGenerator from "debug";

export const DEBUG = debugGenerator("css-blocks:ember-cli");
export const IDENTITY = (item: any): any => item;

// basically copied out of Glimmer as it doesn't export this type
// (tho it does define it internally). Ideally we'd just extend
// this with app as the optional definition
export interface GlimmerModuleConfig {
  app?: import("@glimmer/resolver").PackageDefinition;
  types: {
      application: {
          definitiveCollection: string;
      };
      component: {
          definitiveCollection: string;
      };
      "component-test": {
          unresolvable: boolean;
      };
      helper: {
          definitiveCollection: string;
      };
      "helper-test": {
          unresolvable: boolean;
      };
      renderer: {
          definitiveCollection: string;
      };
      stylesheet?: {
        definitiveCollection: string;
      };
      template: {
          definitiveCollection: string;
      };
  };
  collections: {
      main: {
          types: string[];
      };
      components: {
          group: string;
          types: string[];
          defaultType: string;
          privateCollections: string[];
      };
      styles: {
          group: string;
          unresolvable: boolean;
      };
      utils: {
          unresolvable: boolean;
      };
  };
}

type AdaptedModuleConfig = Partial<import("@glimmer/resolver").ResolverConfiguration> | import("@glimmer/resolver").ResolverConfiguration | GlimmerModuleConfig;

export type Env = {
  isAddon: boolean;
  isEmber: boolean;
  isGlimmer: boolean;
  app: EmberAppAddon;
  parent: EmberAppAddon;
  rootDir: string;
  moduleConfig: AdaptedModuleConfig;
  modulePrefix: string;
};

// TODO: split the following up into something that can have a partial for all those optional props
export type Addon = {
  name?: string;
  outputFile?: string;
  aggregateFile?: string;
  isDevelopingAddon(): boolean;
  _modulePrefix(): string;
  parent?: EmberAppAddon;
  isEmber?: boolean;
  _options?: AddonOptions;
  transports?: Map<EmberAppAddon, import("@css-blocks/broccoli").Transport>;
  astPlugin(env: any): import("@css-blocks/glimmer").GlimmerRewriter;
  optionsForCacheInvalidation(): AddonCacheOptions;
  _owners?: Set<EmberAppAddon>;
  setupPreprocessorRegistry(type: string, registry: any): void;
  discoverAddons(): void;
  included(parent: EmberAppAddon ): void;
  postprocessTree(name: string, tree: any): void;
  getEnv(parent: EmberAppAddon): Env;
  getOptions(env: Env): AddonOptions;
  genTreeWrapper(env: Env, options: AddonOptions, type: string, prev?: any): any;
  env?: Env;
  _super?: Addon;
  addonPackages?: object;
  idAllocator?: import("./IDAllocator").IDAllocator;
  app?: EmberAppAddon;
};
export interface AddonOptions {
  parserOpts: import("@css-blocks/core").Options;
  analysisOpts: import("@css-blocks/core").AnalysisOptions;
  disabled?: boolean;
  output?: string;
  entry?: Array<string>;
  optimization: {
    identifiers?: {
      startValue?: number;
      maxCount?: number;
    };
    enabled: boolean;
  };
  aliases: object;
}

export interface AddonCacheOptions{
  parserOpts: any;
  analysisOpts: import("@css-blocks/core").AnalysisOptions;
  optimization: {
    identifiers?: {
      startValue?: number;
      maxCount?: number;
    };
    enabled: boolean;
  };
  aliases: object;
}

type StringOrFn = string | (() => string) ;

export type EmberAppAddon = {
  name: StringOrFn;
  moduleName: StringOrFn;
  modulePrefix?: string;
  trees: any;
  options: any;
  app?: EmberAppAddon;
  parent?: EmberAppAddon;
  _cachedAddonTemplateFiles: any;
  project: EmberAppAddon;
  root: string;
  treeForAddon(tree: any): any;
  treeForApp(tree: any): any;
  treeForAddonStyles(tree: any): any;
  treeForAppStyles(tree: any): any;
  preprocessTree(type: string, tree: any): any;
  isProduction: boolean;
  import(location: string, options: object): void;
  config(): { modulePrefix?: string };
  registry?: {
    availablePlugins: object;
  };
};
