// from https://github.com/typed-ember/ember-cli-typescript/blob/master/ts/types/ember-cli-preprocess-registry/index.d.ts
declare module 'ember-cli-preprocess-registry' {
  import { Node as BroccoliNode } from 'broccoli-node-api';

  export = PreprocessRegistry;

  class PreprocessRegistry {
    add(type: string, plugin: PreprocessPlugin): void;
    load(type: string): Array<PreprocessPlugin>;
    extensionsForType(type: string): Array<string>;
    remove(type: string, plugin: PreprocessPlugin): void;
  }

  interface PreprocessPlugin {
    name: string;
    toTree(input: BroccoliNode, path: string): BroccoliNode;
  }
}