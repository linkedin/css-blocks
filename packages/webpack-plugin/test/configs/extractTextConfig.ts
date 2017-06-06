import ExtractTextPlugin = require("extract-text-webpack-plugin");
import * as webpack from "webpack";
import * as merge from "webpack-merge";
import { config as defaultOutputConfig } from "./defaultOutputConfig";
import { BLOCK_LOADER_PATH } from "../util/testPaths";
import { LoaderOptions } from "../../src/LoaderOptions";

// const path = require("path");

export function config(entry: string, options?: LoaderOptions): webpack.Configuration {
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