---
name: Configuration
title: Configuring CSS Blocks
---

CSS Blocks should work for most users out-of-the-box. However, should you find that you need to configure your CSS Blocks instance, you can easily do so in your `ember-cli-build.js` file.

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
