import type { ASTPluginBuilder } from '@glimmer/syntax';

// from https://github.com/typed-ember/ember-cli-typescript/blob/master/ts/types/ember-cli-preprocess-registry/index.d.ts
declare module 'ember-cli-preprocess-registry' {
  import { Node as BroccoliNode } from 'broccoli-node-api';

  export = PreprocessRegistry;

  class PreprocessRegistry {
    add(type: string, plugin: Plugin): void;
    load(type: string): Array<Plugin>;
    extensionsForType(type: string): Array<string>;
    remove(type: string, plugin: Plugin): void;
  }

  type Plugin = PreprocessPlugin | ASTPlugin;

  interface PreprocessPlugin {
    name: string;
    toTree(input: BroccoliNode, path: string): BroccoliNode;
    [key: string]: unknown;
  }

  interface ASTPlugin {
    name: string;
    plugin: ASTPluginBuilder;
    dependencyInvalidation?: boolean,
    cacheKey?: () => object,
    baseDir?: () => string,
  }
}