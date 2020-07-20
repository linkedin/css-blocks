declare module 'ember-cli/lib/broccoli/ember-app' {
  import { Node as BroccoliNode } from 'broccoli-node-api';
  import CoreObject from 'core-object';
  import Project from 'ember-cli/lib/models/project';

  export default class EmberApp extends CoreObject {
    options: Record<string, unknown>;
    name: string;
    project: Project;
    isProduction: boolean;
    addonTree(): BroccoliNode;
  }
}

declare module 'ember-cli/lib/models/addon' {
  import { Node as BroccoliNode } from 'broccoli-node-api';
  import CoreObject, { ExtendOptions } from 'core-object';
  import UI from 'console-ui';
  import { Application } from 'express';
  import Project from 'ember-cli/lib/models/project';
  import Command from 'ember-cli/lib/models/command';
  import EmberApp from 'ember-cli/lib/broccoli/ember-app';
  import PreprocessRegistry from 'ember-cli-preprocess-registry';

  type Nullable<T> = T | null | undefined;
  type Tree = BroccoliNode | string;

  export type ThisAddon<T> = T & Addon & {_super: Addon};

  export type AddonImplementation<A = {}> = AddonInterface<A> & A;
  export interface AddonInterface<A = {}> {
    name: string;
    /**
     * Initializes the addon. If you override this method make sure and call this._super.init && this._super.init.apply(this, arguments); or your addon will not work.
     */
    init?(this: ThisAddon<A>, parent: Addon | EmberApp, project: Project): void;
        /**
     * Returns the module name for this addon.
     */
    moduleName?(this: ThisAddon<A>): string;
    /**
     * Returns the path for addon blueprints.
     */
    blueprintsPath?(this: ThisAddon<A>): string;
    /**
     * Augments the applications configuration settings.
     */
    config?(this: ThisAddon<A>, env: string, baseConfig: EmberConfig): EmberConfig;
    /**
     * The addon's dependencies based on the addon's package.json
     */
    dependencies?(this: ThisAddon<A>);
    /**
     * Return true if the addon is using module unification.
     */
    isModuleUnification?(this: ThisAddon<A>): boolean;
    /**
     * Find an addon of the current addon.
     */
    findOwnAddonByName?(this: ThisAddon<A>, name: string): EmberAddon;
    /**
     * Check if the current addon intends to be hinted. Typically this is for hinting/linting libraries such as eslint or jshint.
     */
    hintingEnabled?(this: ThisAddon<A>): boolean;
    /**
     * Allows to mark the addon as developing, triggering live-reload in the project the addon is linked to.
     */
    isDevelopingAddon?(this: ThisAddon<A>): boolean;
    /**
     * Returns a given type of tree (if present), merged with the application tree. For each of the trees available using this method, you can also use a direct method called treeFor[Type] (eg. treeForApp).
     */
    treeFor?(this: ThisAddon<A>, name): Tree;
    /**
     * Calculates a cacheKey for the given treeType. It is expected to return a cache key allowing multiple builds of the same tree to simply return the original tree (preventing duplicate work). If it returns null / undefined the tree in question will opt out of this caching system.
     */
    cacheKeyForTree?(this: ThisAddon<A>, treeType: TreeTypes): string;
    /**
     * Imports an asset into the app.
     */
    import?(this: ThisAddon<A>, asset: string, options?: OpenObject): void;
    /**
     * Returns the tree for all app files
     */
    treeForApp?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for app template files.
     */
    treeForTemplates?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns the tree for this addon's templates.
     */
    treeForAddonTemplates?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns a tree for this addon
     */
    treeForAddon?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for app style files.
     */
    treeForStyles?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns the tree for all public files.
     */
    treeForPublic?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for all test support files.
     */
    treeForTestSupport?(this: ThisAddon<A>, tree): Tree
    /**
     * Returns the tree for all vendor files.
     */
    treeForVendor?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>
    /**
     * Returns the tree for all test files namespaced to a given addon.
     */
    treeForAddonTestSupport?(this: ThisAddon<A>, tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * compiles this addon's styles, the output tree has css files.
     * @private but useful
     */
    compileStyles?(this: ThisAddon<A>, addonStylesTree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Compiles this addon's templates, the output tree has js files.
     * @private but useful
     */
    compileTemplates?(this: ThisAddon<A>, addonTree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Compiles this addon's js, the output tree has gone through babel.
     * @private but useful
     */
    processedAddonJsFiles?(this: ThisAddon<A>, addonTree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Is the addon enabled?
     */
    isEnabled?(this: ThisAddon<A>): boolean;
    /**
     * Can be used to exclude addons from being added as a child addon.
     */
    shouldIncludeChildAddon?(this: ThisAddon<A>, addon: Addon): boolean;
    /**
     * This method is called when the addon is included in a build. You would typically use this hook to perform additional imports.
     */
    included?(this: ThisAddon<A>, includer: Project | Addon): void;
    /**
     * Allows the specification of custom addon commands. Expects you to return an object whose key is the name of the command and value is the command instance.
     */
    includedCommands?(this: ThisAddon<A>): Record<string, typeof Command | ExtendOptions<Command>> | void;
    /**
     * This hook allows you to make changes to the express server run by ember-cli.
     */
    serverMiddleware?(this: ThisAddon<A>, options: { app: Application }): void | Promise<void>;

    /**
     * This hook allows you to make changes to the express server run by testem.
     */
    testemMiddleware?(this: ThisAddon<A>, app: Application): void;

    /**
     * Used to add preprocessors to the preprocessor registry. This is often used by addons like ember-cli-htmlbars and ember-cli-coffeescript to add a template or js preprocessor to the registry.
     */
    setupPreprocessorRegistry?(this: ThisAddon<A>, type: 'self' | 'parent', registry: PreprocessRegistry): void;

    /**
     * This hook is called when an error occurs during the preBuild, postBuild or outputReady hooks for addons, or when the build fails.
     * @param error
     */
    buildError?(this: ThisAddon<A>, error: Error): void;
    /**
     * Allow addons to implement contentFor method to add string output into the associated {{content-for 'foo'}} section in index.html
     */
    contentFor?(this: ThisAddon<A>, type, config, content): void;
    /**
     * Allows addons to define a custom transfrom function that other addons and app can use when using app.import.
     */
    importTransforms?(this: ThisAddon<A>): Object;

    /**
     * Return value is merged into the tests tree. This lets you inject linter output as test results.
     */
    lintTree?(this: ThisAddon<A>, treeType: string, tree: Tree): Tree;
    /**
     * This hook is called after the build has been processed and the build files have been copied to the output directory.
     */
    outputReady?(this: ThisAddon<A>, result: any): void;
    /**
     * This hook is called after a build is complete.
     */
    postBuild?(this: ThisAddon<A>, result: unknown): void;
    /**
     * Post-process a tree.
     */
    postprocessTree?(this: ThisAddon<A>, type: "css" | "template" | "js", tree: Tree): Tree
    /**
     * This hook is called before a build takes place.
     */
    preBuild?(this: ThisAddon<A>, result: unknown): void;
    /**
     * Pre-process a tree.
     */
    preprocessTree?(this: ThisAddon<A>, type: "css" | "template" | "js", tree: Tree): Tree;
  }

  export default class Addon extends CoreObject {
    name: string;
    root: string;
    app?: EmberApp;
    parent: Addon | Project;
    project: Project;
    addons: Addon[];
    ui: UI;
    options?: Record<string, unknown>;
    pkg: {
      name: string;
      version: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    /**
     * Initializes the addon. If you override this method make sure and call this._super.init && this._super.init.apply(this, arguments); or your addon will not work.
     */
    init(parent: Addon | EmberApp, project: Project): void;
    /**
     * Returns the module name for this addon.
     */
    moduleName(): string;
    /**
     * Returns the path for addon blueprints.
     */
    blueprintsPath(): string;
    /**
     * Augments the applications configuration settings.
     */
    config?(env: string, baseConfig: EmberConfig): EmberConfig;
    /**
     * The addon's dependencies based on the addon's package.json
     */
    dependencies();
    /**
     * Return true if the addon is using module unification.
     */
    isModuleUnification(): boolean;
    /**
     * Find an addon of the current addon.
     */
    findOwnAddonByName(name: string): EmberAddon;
    /**
     * Check if the current addon intends to be hinted. Typically this is for hinting/linting libraries such as eslint or jshint.
     */
    hintingEnabled(): boolean;
    /**
     * Allows to mark the addon as developing, triggering live-reload in the project the addon is linked to.
     */
    isDevelopingAddon(): boolean;
    /**
     * Returns a given type of tree (if present), merged with the application tree. For each of the trees available using this method, you can also use a direct method called treeFor[Type] (eg. treeForApp).
     */
    treeFor(name): Tree;
    /**
     * Calculates a cacheKey for the given treeType. It is expected to return a cache key allowing multiple builds of the same tree to simply return the original tree (preventing duplicate work). If it returns null / undefined the tree in question will opt out of this caching system.
     */
    cacheKeyForTree(treeType: TreeTypes): String
    /**
     * @private but useful
     */
    _findHost(): EmberApp;
    /**
     * Imports an asset into the app.
     */
    import(asset: string, options?: OpenObject): void;
    /**
     * Returns the tree for all app files
     */
    treeForApp(tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for app template files.
     */
    treeForTemplates(tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns the tree for this addon's templates.
     */
    treeForAddonTemplates(tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns a tree for this addon
     */
    treeForAddon(tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for app style files.
     */
    treeForStyles(tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Returns the tree for all public files.
     */
    treeForPublic(tree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Returns the tree for all test support files.
     */
    treeForTestSupport(tree: Nullable<Tree>): Nullable<Tree>
    /**
     * Returns the tree for all vendor files.
     */
    treeForVendor(tree: Nullable<Tree>): Nullable<Tree>
    /**
     * Returns the tree for all test files namespaced to a given addon.
     */
    treeForAddonTestSupport(tree: Nullable<Tree>): Nullable<Tree>;

    /**
     * compiles this addon's styles, the output tree has css files.
     * @private but useful
     */
    compileStyles(addonStylesTree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Compiles this addon's templates, the output tree has js files.
     * @private but useful
     */
    compileTemplates(addonTree: Nullable<Tree>): Nullable<Tree>;

    /**
     * Compiles this addon's js, the output tree has gone through babel.
     * @private but useful
     */
    processedAddonJsFiles(addonTree: Nullable<Tree>): Nullable<Tree>;
    /**
     * Is the addon enabled?
     */
    isEnabled(): boolean;
    /**
     * Can be used to exclude addons from being added as a child addon.
     */
    shouldIncludeChildAddon(addon: Addon): boolean;
    /**
     * This method is called when the addon is included in a build. You would typically use this hook to perform additional imports.
     */
    included(includer: Project | Addon): void;
    /**
     * This structure represents the paths to use to use when `treeFor(TreeType)` is called, the paths are relative to the addon's own `this.root`.
     */
    treePaths: {
      app: string;
      styles: string;
      templates: string;
      addon: string;
      'addon-styles': string;
      'addon-templates': string;
      vendor: string;
      'test-support': string;
      'addon-test-support': string;
      public: string;
    }
  }
}

declare module 'ember-cli/lib/models/blueprint' {
  class Blueprint {
    taskFor(taskName: string): void;
  }
  export = Blueprint;
}

declare module 'ember-cli/lib/models/command' {
  import CoreObject from 'core-object';
  import UI from 'console-ui';
  import Project from 'ember-cli/lib/models/project';

  interface CommandOption {
    name: string;
    type: unknown;
    description?: string;
    required?: boolean;
    default?: unknown;
    aliases?: string[];
  }

  export default class Command extends CoreObject {
    name: string;
    works: 'insideProject' | 'outsideProject' | 'everywhere';
    description: string;
    availableOptions: CommandOption[];
    anonymousOptions: string[];

    ui: UI;
    project: Project;

    run(options: {}): void | Promise<unknown>;
  }
}

declare module 'ember-cli/lib/models/project' {
  import CoreObject from 'core-object';
  import UI from 'console-ui';
  import Addon from 'ember-cli/lib/models/addon';

  export default class Project extends CoreObject {
    ui: UI;
    root: string;
    addons: Addon[];
    pkg: {
      name: string;
      version: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    name(): string;
    isEmberCLIAddon(): boolean;
    require(module: string): unknown;
    findAddonByName(name): Addon;
  }
}