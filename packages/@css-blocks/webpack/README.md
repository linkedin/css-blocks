# Webpack Plugin for CSS Blocks

The `@css-blocks/webpack` package delivers all the pieces necessary to integrate CSS Blocks into any Webpack 3.0 build. (Webpack 4.0 support is forthcoming).

## Getting Started

```
$ npm install --save-dev @css-blocks/webpack
```

## Add to configuration

The Webpack integration comes in three (3) parts:

### Plugin

The CSS Blocks Webpack Plugin handles analysis of all JSX files and Block file compilation.

Add it to your plugins list like so:

```js
module.exports =  {
  plugins: [
    /* ... */
    new CssBlocksPlugin({
      name: "css-blocks",
      outputCssFile: "my-output-file.css",
      analyzer: CssBlockAnalyzer,
      compilationOptions: {},
      optimization: {}
    }),
    /* ... */
  ],
  /* ... */
};
```

### Loader

The CSS Blocks Webpack Loader halts project compilation until after the Webpack Plugin finished compiling Blocks. If we did not have to Loader, then JS compilation may execute before CSS compilation is finished, and we wouldn't have any data to rewrite our templates with.

The Loader is passed the chosen template integration's `Analyzer` instance, and a shared data object of the name of `rewriter`. Once Block compilation is finished, the `rewriter` object passed to this loader will be populated with this build's Analysis and StyleMapping data.

This loader must apply to all `jsx` or `tsx` files for the project. Remember, Loaders are executed in *reverse* order, so make sure the CSS Blocks loader appears last in the "rules" list.

Integrate the loader like so:

```js
module.exports =  {
  /* ... */
  module: {
    /* ... */
    rules: [
      /* All Other Loaders Go Here */
      {
        test: /\.[j|t]s(x?)$/,
        exclude: /node_modules/,
        use: [
          // The JSX Webpack Loader halts loader execution until after all blocks have
          // been compiled and template analyses has been run. StyleMapping data stored
          // in shared `rewriter` object.
          {
            loader: require.resolve("@css-blocks/webpack/dist/src/loader"),
            options: {
              analyzer: CssBlockAnalyzer,
              rewriter: CssBlockRewriter
            }
          },
        ]
      }
    ]
  }
  /* ... */
}
```

### Rewriter Integration

Each template integration's rewriter is slightly different and must be integrated with whatever template compilation plugin is required of it. All template integrations will have an API to accept the `rewriter` shared-memory object populated in our `Loader`.

However, Webpack will typically be used with CSS Blocks' JSX integration. The typical JSX end-to-end integration with webpack looks like this:

```js

const jsxCompilationOptions = {
  compilationOptions: {},
  types: "none",
  aliases: {},
  optimization: {
    rewriteIdents: true,
    mergeDeclarations: true,
    removeUnusedStyles: true,
    conflictResolution: true,
    enabled: false,
  },
};

const CssBlocks = require("@css-blocks/jsx");
const CssBlocksPlugin = require("@css-blocks/webpack").CssBlocksPlugin;
const CssBlockRewriter = new CssBlocks.Rewriter();
const CssBlockAnalyzer = new CssBlocks.Analyzer(paths.appIndexJs, jsxCompilationOptions);

module.exports =  {
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
              analyzer: CssBlockAnalyzer,
              rewriter: CssBlockRewriter
            }
          },
        ]
      }
    ]
  }

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
