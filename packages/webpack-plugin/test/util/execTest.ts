import * as path from "path";
import * as fs from "fs";
import * as webpack from "webpack";
import * as merge from "webpack-merge";
import { assert } from "chai";
const pathToBlockLoader = require.resolve("../../src/index.js");
const CR = /\r/g;

const DIST_DIRECTORY = path.resolve(__dirname, "..", "..");
const FIXTURES_DIRECTORY = path.resolve(DIST_DIRECTORY, "..", "test", "fixtures");

export interface TemporaryLoaderOpts {
    [opt: string] : any;
}

// This test harness was adapted from the sass-loader test suite.

export default function execTest(testId: string, options?: TemporaryLoaderOpts) {
        return new Promise((resolve, reject) => {
            const baseConfig = merge({
                entry: path.join(FIXTURES_DIRECTORY, testId + ".block.css"),
                output: {
                    filename: "bundle.block.css.js"
                },
                module: {
                    rules: [{
                        test: /\.block\.css$/,
                        use: [
                            { loader: "raw-loader" },
                            { loader: pathToBlockLoader, options }
                        ]
                    }]
                }
            });

            runWebpack(baseConfig, (err: Error) => err ? reject(err) : resolve());
        }).then(() => {
            const actualCss = readBundle("bundle.block.css.js");
            const expectedCss = readCss(testId);

            // writing the actual css to output-dir for better debugging
            // fs.writeFileSync(path.join(__dirname, "output", `${ testId }.${ ext }.css`), actualCss, "utf8");
            assert.deepEqual(actualCss, expectedCss);
        });
    }


function readCss(id: string): string {
  let css = fs.readFileSync(path.join(FIXTURES_DIRECTORY, id + ".css"), "utf8")
  css = css.replace(CR, "");
  css = css.replace("FIXTURES_DIRECTORY", FIXTURES_DIRECTORY);
  return css;
}

function runWebpack(baseConfig: webpack.Configuration, done: (err: Error) => void) {
    const webpackConfig = merge({
        output: {
            path: path.join(DIST_DIRECTORY, "test_output"),
            filename: "bundle.js",
            libraryTarget: "commonjs2"
        }
    }, baseConfig);

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