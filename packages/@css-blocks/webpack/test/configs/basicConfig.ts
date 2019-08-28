import { ObjectDictionary } from "@opticss/util";
import { Configuration as WebpackConfiguration } from "webpack";
import * as merge from "webpack-merge";

import { LoaderOptions } from "../../src/LoaderOptions";
import { CssBlocksPlugin } from "../../src/Plugin";
import { TestAnalyzer } from "../util/TestAnalyzer";
import { BLOCK_LOADER_PATH } from "../util/testPaths";

import { config as defaultOutputConfig } from "./defaultOutputConfig";

export type EntryTypes = string | string[] | ObjectDictionary<string>;

export function config(entry: EntryTypes, options?: LoaderOptions): WebpackConfiguration {
  const baseConfig: WebpackConfiguration = {
    entry: entry,
    output: {
        filename: "bundle.block.css.js",
    },
    module: {
        rules: [{
            test: /\.block\.css$/,
            use: [
                { loader: "raw-loader" },
                { loader: BLOCK_LOADER_PATH, options },
            ],
        }],
    },
    plugins: [
        new CssBlocksPlugin({
            name: "preact",
            outputCssFile: "css-blocks.css",
            analyzer: new TestAnalyzer(),
        }),
    ],
  };

  // The webpack types used by webpack-merge don't agree with ours.
  // tslint:disable-next-line:prefer-unknown-to-any
  return merge(defaultOutputConfig() as any, baseConfig as any) as any;
}
