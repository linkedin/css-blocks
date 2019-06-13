---
name: Installation
title: Installation
---

To use CSS Blocks in your Ember application, simply run:

```bash
ember install @css-blocks/ember-cli
```

> NOTE: @css-blocks/ember-cli must be installed as a `dependency`, not a `devDependency` to run properly, even in addons and engines.

Once added, the CSS Blocks addon will do **nothing** until you begin adding Block files! By default, this addon no-ops for every template without an associated Block file, leaving your code completly un-touched until you begin to opt-in to CSS Blocks template-by-template.

In Ember, we enforce one Block per template. Depending on the folder structure convention you've chosen for your application, you can add these per-template Block files in one of two ways.

## Classic Ember
In classic Ember, these Block files live in the `/styles` directory, using the same "convention over configuration" approach that `Controllers` use, with a `/styles/<name>.block.css` file:

```bash
 - /src
 |- /routes
 |  |- login.js
 |- /controllers
 |  |- application.js
 |  |- login.js
 |- /components
 |  |- my-component.js
 |- /templates
 |  |- application.hbs
 |  |- login.hbs
 |  |- /components
 |     |- my-component.hbs
 |- /styles
    |- app.css
    |- application.block.css
    |- login.block.css
    |- /components
       |- my-component.block.css
```

## Pods Structure
When using pods structure, each pod may now also contain a `stylesheet.block.css`:

```bash
 - /src
 |- /components
    |- my-component
       |- template.hbs
       |- controller.js
       |- stylesheet.block.css
```

The presence of a Block file enables CSS Blocks for only the associated template and will add it to the CSS Blocks build.
