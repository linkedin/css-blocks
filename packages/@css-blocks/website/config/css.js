"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cssBlocksWebpackPlugin = require("@css-blocks/webpack");
var webpackSources = require("webpack-sources");
// tslint:disable-next-line:no-var-requires
var CleanCSS = require('clean-css');
// tslint:disable-next-line:no-var-requires
var autoprefixer = require('autoprefixer');
var minifier = new CleanCSS({
    returnPromise: true,
    level: 1,
    sourceMap: true,
    sourceMapInlineSources: false,
});
var noopProcessor = function (asset) { return asset; };
var minifierAdapter = function (asset, assetPath) {
    var source = asset.source();
    var map = asset.map();
    return minifier.minify(source).then(function (result) {
        // console.log(`${assetPath} minified from ${result.stats.originalSize} to ${result.stats.minifiedSize} in ${
        //     result.stats.timeSpent
        //   }ms`,
        // );
        var g = result.sourceMap;
        return new webpackSources.SourceMapSource(result.styles, assetPath, g.toJSON(), source, map);
    });
};
module.exports = function (options) {
    let browsers = options.browsers || [
      "> 1%",
      "last 2 versions"
    ];
    var assetOptions = {
        cssFiles: {
            'prism.css': 'public/lib/prismjs/prism.css',
            'baseline.css': 'public/lib/baseline.css',
        },
        concat: {
            'css-blocks.css': {
                sources: ['prism.css', 'baseline.css', 'blocks.css'],
                postProcess: {
                    postcss: [autoprefixer({ browsers })],
                    processor: options.minify ? minifierAdapter : noopProcessor,
                },
            },
        },
        inlineSourceMaps: options.inlineSourceMaps,
    };
    return new cssBlocksWebpackPlugin.CssAssets(assetOptions);
};
