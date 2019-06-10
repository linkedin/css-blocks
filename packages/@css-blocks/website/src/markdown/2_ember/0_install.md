---
name: Installation
title: Installation
---

To use CSS Blocks in your Ember application, simply run:

```bash
yarn add @css-blocks/ember-cli
```

Once installed, every template may have a corresponding `<name>.block.css` file. The presence of this file enables CSS Blocks for that particular template and will add it to the CSS Blocks build.

> NOTE: @css-blocks/ember-cli must be installed as a `dependency`, not a `devDependency` to run properly, even in addons and engines.