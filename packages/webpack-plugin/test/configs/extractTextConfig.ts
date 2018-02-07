import ExtractTextPlugin = require("extract-text-webpack-plugin");
import { Configuration as WebpackConfiguration } from "webpack";
import * as merge from "webpack-merge";

import { LoaderOptions } from "../../src/LoaderOptions";
import { BLOCK_LOADER_PATH } from "../util/testPaths";

import { config as defaultOutputConfig } from "./defaultOutputConfig";

// const path = require("path");

export function config(entry: string, options?: LoaderOptions): WebpackConfiguration {
  const extractText = new ExtractTextPlugin({
      filename: "[name].[contenthash].css"
  });

  return merge(defaultOutputConfig(), {
    entry: entry,
    output: {
      filename: "bundle.extractText.js"
    },
    module: {
      rules: [
        {
          test: /\.block\.css$/,
          use: extractText.extract({
            use: [
              { loader: "css-loader" },
              { loader: BLOCK_LOADER_PATH, options: options }
            ],
            fallback: "style-loader"
          })
        }
      ]
    },
    plugins: [
      extractText
    ]
  });
}