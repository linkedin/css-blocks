import * as path from "path";
import * as webpack from "webpack";
import { DIST_DIRECTORY } from "../util/testPaths";

export function config(outputPath?: string): webpack.Configuration {
  outputPath = outputPath || path.join(DIST_DIRECTORY, "test_output");
  return {
    output: {
            path: outputPath,
            filename: "bundle.js",
            libraryTarget: "commonjs2"
        }
  };
}