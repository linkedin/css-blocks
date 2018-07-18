import { helper } from "@ember/component/helper";

// For some reason Ember doesn't include the helper runtime from `@css-blocks/glimmer`
// in the build and throws a "missing module" error at runtime. The contents have been
// temporarily copied to `./tmp` as a workaround instead... this will block release.
// import { classnames } from "@css-blocks/glimmer/dist/src/helpers/classnames";
import { classnames } from "./tmp";

export default helper(classnames);
export { classnames };