import { loader } from "webpack";

/**
 * The css-blocks loader makes css-blocks available to webpack modules.
 *
 * @this {loader.LoaderContext}
 * @param {string} content
 */
const sassLoader: loader.Loader = function(content: string) {
    const callback = this.async();
    if (typeof callback !== "function") {
      throw new Error("synchronous compilation is not supported");
    }
    console.log(content);
    callback(null);
};

export = sassLoader;