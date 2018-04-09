import { Analyzer } from "css-blocks";
import { Configuration as WebpackConfiguration } from "webpack";
import * as merge from "webpack-merge";

import { LoaderOptions } from "../../src/LoaderOptions";
import { CssBlocksPlugin } from "../../src/Plugin";

import { BLOCK_LOADER_PATH } from "../util/testPaths";

import { config as defaultOutputConfig } from "./defaultOutputConfig";

export class TestAnalyzer extends Analyzer<"Opticss.Template"> {
    analyze(): Promise<Analyzer<"Opticss.Template">> { return Promise.resolve(this); }
}

export function config(entry: string, options?: LoaderOptions): WebpackConfiguration {
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
  return merge(defaultOutputConfig(), baseConfig);
}
