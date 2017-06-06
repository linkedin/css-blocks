import { loader } from "webpack";
import postcss = require("postcss");
import * as loaderUtils from "loader-utils";
import cssBlocks from "css-blocks";

let selfPath = require.resolve("./index.js");

/**
 * The css-blocks loader makes css-blocks available to webpack modules.
 *
 * @this {loader.LoaderContext}
 * @param {string} content
 */
const blockLoader: loader.Loader = function(content: string) {
    const callback = this.async();
    if (typeof callback !== "function") {
      throw new Error("synchronous compilation is not supported");
    }
    this.cacheable();
    let thisLoader = this.loaders.find(loader => loader.path === selfPath);
    let options;
    if (thisLoader.options) {
      options = thisLoader.options;
    } else {
      options = loaderUtils.getOptions(this);
    }
    let plugin = cssBlocks(postcss)(options);
    let result = postcss([plugin]).process(content, {from: this.resourcePath});
    result.then((result) => {
      callback(null, result.css);
    }, (error) => {
      callback(error);
    });
};

export = blockLoader;