import * as path from "path";
import * as fs from "fs";
import * as webpack from "webpack";
import { assert } from "chai";
import { DIST_DIRECTORY, BLOCK_FIXTURES_DIRECTORY } from "./testPaths";
import { LoaderOptions } from "../../src/LoaderOptions";
import { config as basicConfig } from "../configs/basicConfig";
const CR = /\r/g;

// This test harness was adapted from the sass-loader test suite.

export default function execTest(testId: string, options?: LoaderOptions) {
    const entryPath = path.join(BLOCK_FIXTURES_DIRECTORY, testId + ".block.css");
    return runWebpackAsPromise(basicConfig(entryPath, options))
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

export function runWebpackAsPromise(webpackConfig: webpack.Configuration) {
  return new Promise((resolve, reject) => {
      runWebpack(webpackConfig, (err: Error) => err ? reject(err) : resolve());
  });
}

function runWebpack(webpackConfig: webpack.Configuration, done: (err: Error) => void) {
    webpack(webpackConfig, (webpackErr, stats) => {
        const err = webpackErr ||
            (stats.hasErrors() && (<any>stats).compilation.errors[0]) ||
            (stats.hasWarnings() && (<any>stats).compilation.warnings[0]);

        done(err || null);
    });
}

function readBundle(filename: string) {
    const outputLocation = path.resolve(DIST_DIRECTORY, `./test_output/${ filename }`);
    delete require.cache[outputLocation];

    return require(outputLocation);
}