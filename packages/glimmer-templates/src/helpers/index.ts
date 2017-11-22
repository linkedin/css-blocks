export { default as classnames } from './classnames';
export { default as concat } from './concat';

/*
  This metadata tells Glimmer's Bundle Compiler where
  the helpers are located so it can codegen an ES6 import
  for it when the helper is used. For instance:

  ```hbs
    <div class="{{/css-blocks/components/concat thing "-foo" }}">...</div>
  ```

  Will generate an import like:

  ```js
  import { concat as concat_1 } from '@css-blocks/glimmer-templates/dist/src/helpers';
  ...
  export const externalModuleTable = [..., concat_0];
  ```

  Please note you want to always set factory to `false` unless you
  are directly produce Glimmer references from @glimmer/references.
*/
export const cssBlocksHelpers = {
  '/css-blocks/components/concat': {
    kind: 'helper',
    module: '@css-blocks/glimmer-templates/dist/src/helpers',
    name: 'concat',
    meta: { factory: false }
  },
  '/css-blocks/components/classnames': {
    kind: 'helper',
    module: '@css-blocks/glimmer-templates/dist/src/helpers',
    name: 'classnames',
    meta: { factory: false }
  }
};
