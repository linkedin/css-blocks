// @ts-check
const fs = require("fs");
const path = require("path");
const { Rewriter, Analyzer } = require('@css-blocks/jsx');
const { OutputMode } = require('@css-blocks/core');
const { CssBlocksPlugin, LOADER } = require('@css-blocks/webpack');

const cssBlocksRewriter = require('@css-blocks/jsx/dist/src/transformer/babel')

const cssBlocksOptions = {
};
const opticssOptions = {
  rewriteIdents: true,
  mergeDeclarations: true,
  removeUnusedStyles: true,
  conflictResolution: true
};
const analyzerOptions = {
  compilationOptions: cssBlocksOptions,
  optimization: opticssOptions
};

const rewriter = new Rewriter();
const analyzer = new Analyzer(analyzerOptions);

module.exports = {
  entry: ['./src/index.jsx'],
  module: {
    rules: [
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('babel-loader'),
            options: {
              presets: ["env", "react", "stage-2"],
              cacheDirectory: true,
              compact: true
            }
          },
          {
            loader: require.resolve('babel-loader'),
            options: {
              plugins: [
                cssBlocksRewriter.babelPlugin({ rewriter })
              ],
              parserOpts: {
                plugins: ['jsx']
              }
            }
          },
          {
            loader: LOADER,
            options: {
              analyzer,
              rewriter
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new CssBlocksPlugin({
      analyzer,
      outputCssFile: 'bundle.css',
      compilationOptions: cssBlocksOptions,
      optimization: opticssOptions
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: './dist'
  }
};
