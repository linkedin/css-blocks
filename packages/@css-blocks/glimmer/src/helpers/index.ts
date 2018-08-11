export { default as classnames } from "./classnames";
export { default as concat } from "./concat";

export const CONCAT_HELPER_NAME = "-css-blocks-concat";
export const CLASSNAMES_HELPER_NAME = "-css-blocks-classnames";

/*
  This metadata tells Glimmer's Bundle Compiler where
  the helpers are located so it can codegen an ES6 import
  for it when the helper is used. For instance:

  ```hbs
    <div class="{{-css-blocks-concat thing "-foo" }}">...</div>
  ```

  Will generate an import like:

  ```js
  import { concat as concat_1 } from '@css-blocks/glimmer/dist/src/helpers';
  ...
  export const externalModuleTable = [..., concat_0];
  ```

  Please note you want to always set factory to `false` unless you
  are directly produce Glimmer references from @glimmer/references.
*/
export const cssBlocksHelpers = {
  "concat": {
    kind: "helper",
    module: "@css-blocks/glimmer/dist/src/helpers",
    name: CONCAT_HELPER_NAME,
    meta: { factory: false },
  },
  "classnames": {
    kind: "helper",
    module: "@css-blocks/glimmer/dist/src/helpers",
    name: CLASSNAMES_HELPER_NAME,
    meta: { factory: false },
  },
};
