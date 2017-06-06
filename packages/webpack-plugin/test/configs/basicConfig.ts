import * as webpack from "webpack";
import * as merge from "webpack-merge";
import { config as defaultOutputConfig } from "./defaultOutputConfig";
import { BLOCK_LOADER_PATH } from "../util/testPaths";
import { LoaderOptions } from "../../src/LoaderOptions";

export function config(entry: string, options?: LoaderOptions): webpack.Configuration {
  const baseConfig: webpack.Configuration = {
      entry: entry,
      output: {
          filename: "bundle.block.css.js"
      },
      module: {
          rules: [{
              test: /\.block\.css$/,
              use: [
                  { loader: "raw-loader" },
                  { loader: BLOCK_LOADER_PATH, options }
              ]
          }]
      },
  };
  return merge(defaultOutputConfig(), baseConfig);
}