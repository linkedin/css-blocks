import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as webpack from "webpack";

import { LoaderOptions } from "../../src/LoaderOptions";
import { WebpackAny } from "../../src/Plugin";
import { EntryTypes, config as basicConfig } from "../configs/basicConfig";

import { BLOCK_FIXTURES_DIRECTORY, DIST_DIRECTORY, WEBPACK_DEV_SERVER_PATH } from "./testPaths";
const CR = /\r/g;

// This test harness was adapted from the sass-loader test suite.

export function execTest(testId: string, options?: LoaderOptions, entryFormat: "string" | "object" | "array" | "dev-server" = "string") {
    const entryPath: string = path.join(BLOCK_FIXTURES_DIRECTORY, testId + ".block.css");
    let entry: EntryTypes = entryPath;

    if (entryFormat === "array") {
        entry = [entryPath];
    }
    else if (entryFormat === "object") {
        entry = { main: entryPath };
    }
    else if (entryFormat === "dev-server") {
        entry = [WEBPACK_DEV_SERVER_PATH, "webpack/hot/dev-server", entryPath];
    }

    return runWebpackAsPromise(basicConfig(entry, options))
    .then(() => {
        const actualCss = readBundle("bundle.block.css.js");
        const expectedCss = readCss(testId);

        // writing the actual css to output-dir for better debugging
        // fs.writeFileSync(path.join(__dirname, "output", `${ testId }.${ ext }.css`), actualCss, "utf8");
        assert.deepEqual(actualCss, expectedCss);
    });
}

export function readCss(id: string): string {
  let css = fs.readFileSync(path.join(BLOCK_FIXTURES_DIRECTORY, id + ".css"), "utf8");
  css = css.replace(CR, "");
  css = css.replace("FIXTURES_DIRECTORY", BLOCK_FIXTURES_DIRECTORY);
  return css;
}

export function readCssSourceMap(id: string): string {
  let json = fs.readFileSync(path.join(BLOCK_FIXTURES_DIRECTORY, id + ".css.map"), "utf8");
  json = json.replace(CR, "");
  json = json.replace("FIXTURES_DIRECTORY", BLOCK_FIXTURES_DIRECTORY);
  return JSON.parse(json);
}

export function readAsset(filename: string): string {
  const outputLocation = path.resolve(DIST_DIRECTORY, `./test_output/${ filename }`);
  let content = fs.readFileSync(outputLocation, "utf8");
  content = content.replace(CR, "");
  return content;
}

export function runWebpackAsPromise(webpackConfig: webpack.Configuration) {
  return new Promise((resolve, reject) => {
      runWebpack(webpackConfig, (err: Error) => err ? reject(err) : resolve());
  });
}

function runWebpack(webpackConfig: webpack.Configuration, done: (err: Error) => void) {
    webpack(webpackConfig, (webpackErr, stats) => {
        const err = webpackErr ||
            (stats.hasErrors() && (<WebpackAny>stats).compilation.errors[0]) ||
            (stats.hasWarnings() && (<WebpackAny>stats).compilation.warnings[0]);

        done(err || null);
    });
}

export function readBundle(filename: string) {
    const outputLocation = path.resolve(DIST_DIRECTORY, `./test_output/${ filename }`);
    delete require.cache[outputLocation];

    return require(outputLocation);
}
