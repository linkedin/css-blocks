---
name: Configuration
title: Configuring CSS Blocks
---

CSS Blocks should work for most users out-of-the-box. However, should you find that you need to configure your CSS Blocks integration, you can easily do so in your `ember-cli-build.js` file.

The CSS Blocks configuration object is passed under the `css-blocks` key in your addon options. There are four fields that you may pass options to:

```js
/* ember-cli-build.js */
{
  //...
  "css-blocks": {
     aliases: {},
     optimization: {},
     analysisOpts: {},
     parserOpts: {},
  }
  //...
}
```

## Aliases
The aliases field allows you to alias certain Block import paths to a different file or module. For example, with the following alias:


```js
/* ember-cli-build.js */
{
  "css-blocks": {
     aliases: {
        "my-library": "styles/my-library.block.css"
     }
  }
}
```

All Block imports of `my-library` will actually pull in the local file specified instead.

## Parser Options

These options determine the behavior of CSS Blocks' core Block file parser. You can find a full description of Block parser options on the [Block File Configuration documentation page](/learn/block-files/configuration).

## Optimization

This is where you can pass customization options to Opticss. The most common feature used will be to force enable or disable optimization with `enabled: true|false`, however there are a number of ways to tweak Opticss' options. You can see the full list in [Opticss' documentation](https://www.github.com/linkedin/opticss).

## Analysis Options

This options hash is passed directly to the [Glimmer Analyzer](). You may choose to enable or disable specific template integration features, or build time template linters. It is not recommended that you mess with these settings, but if you must, you can find interface definitions in [the CSS Blocks API docs](https://css-blocks.com/api/interfaces/_css_blocks_core.analysisoptions.html).