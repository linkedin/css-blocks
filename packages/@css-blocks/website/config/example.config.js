// @ts-check
const fs = require("fs");
const path = require("path");
const nodeSass = require("node-sass");
const { promisify } = require("util");

const { resolveConfiguration: cssBlocksConfig } = require("@css-blocks/core");
const CssBlocksJSX = require("@css-blocks/jsx");
const CssBlocksPlugin = require("@css-blocks/webpack").CssBlocksPlugin;
const appDirectory = fs.realpathSync(process.cwd());
const renderSass = promisify(nodeSass.render);
const paths = {
  appIndex: path.resolve(appDirectory, "src/index.tsx"),
};
const jsxCompilationOptions = {
    baseDir: appDirectory,
    types: "typescript", // sets the parser mode to allow typescript, can also be "flow", or "none" if using es6.
    aliases: {}, // pass any webpack aliases mapped to real directory so @block and @export can use them.
    compilationOptions: cssBlocksConfig({ // options for css blocks
        rootDir: appDirectory,
    }),
    parserOptions: {} // Babylon Options for js(x) parsing
}

        // preprocessors: {
        //     scss: (file, data, configuration, sourceMap) => renderSass({file, data, sourceMap: true, outFile: file.replace("scss", "css")}).then((result) => ({content: result.css.toString(), sourceMap: result.map.toString()})
        // },

const CssBlockRewriter = new CssBlocksJSX.Rewriter();
const CssBlockAnalyzer = new CssBlocksJSX.Analyzer(paths.appIndex, jsxCompilationOptions);

module.exports =  {
  entry: [paths.appIndex, /* + other entry points */],
  /* ... */
  module: {
    /* ... */
    rules: [
      /* ... */
      {
        test: /\.[j|t]s(x?)$/,
        exclude: /node_modules/,
        use: [

          /* All Other Loaders Go Here */

          {
            loader: require.resolve('babel-loader'),
            options: {
              plugins: [
                require("@css-blocks/jsx/dist/src/transformer/babel").makePlugin({
                  rewriter: CssBlockRewriter
                }),
              ],
              cacheDirectory: true,
              compact: true,
              parserOpts: {
                plugins: [ "jsx" ]
              }
            }
          },

          // The JSX Webpack Loader halts loader execution until after all blocks have
          // been compiled and template analyses has been run. StyleMapping data stored
          // in shared `rewriter` object.
          {
            loader: require.resolve("@css-blocks/webpack/dist/src/loader"),
            options: {
              analyzer: analyzerInstance,
              rewriter: sharedRewriterData
            }
          },
        ]
      }
    ]
  },

  plugins: [

    new CssBlocksPlugin({
      analyzer: CssBlockAnalyzer,
      outputCssFile: "blocks.css",
      name: "css-blocks",
      compilationOptions: jsxCompilationOptions.compilationOptions,
      optimization: jsxCompilationOptions.optimization
    }),
    /* ... */
  ]
  /* ... */
}