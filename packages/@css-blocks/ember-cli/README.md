
Ember CLI Plugin for CSS Blocks
=============================

Ember CLI integration for Ember CLI built apps.

Installation
------------------------------------------------------------------------------

```
ember install @css-blocks/ember-cli
```

> Be sure that `@css-blocks/ember-cli` is installed as a **dependency** and not a **dev-dependency**.
> Every individual app, addon, or engine must depend on `@css-blocks/ember-cli` individually.

Usage
------------------------------------------------------------------------------

**This addon is pre-1.0 and should be considered experimental**

There are a number of caveats you should know:

 1. Eager engines are a little hacky. We'll want to make some changes to engines proper to make their behavior more consistent with regular addons.
 2. Lazy engines are not supported at this time and will require non-trivial work in `ember-engines` to support. We have a failing (skipped) test for them in this addon.
 3. The optimizer can not be enabled at this time and is hard-coded to disabled.
 4. The broccoli plugins do not have any kind of caching strategy right now! That, and build impact stats / tests, are coming soon.

The four above items will need to be finished in order to call this addon "done". We will be tracking these all in separate tickets.

But otherwise, this works for unlocking CSS Blocks syntax in your addons and apps 🎉

To style any component in an addon with CSS Blocks simply add a corresponding `styles/components/component-name.block.css` file. The addon will auto-discover this file and build accordingly.

For Glimmer template syntax, plese see [`@css-blocks/glimmer`](../glimmer/README.md).
For CSS Blocks syntax, plese see [the main project's readme](../../../README.md).

## Styling `{{link-to}}`

In the Ember + CSS Blocks build, the built-in `{{link-to}}` component receives special treatment. The `{{link-to}}` component manages its own internal style application for `[loading]`, `[active]` and `[disabled]`. To style a `{{link-to}} in these special states, simply apply a class with those special state names and Ember will apply the correct classes at runtime as required. For example:

```css
/* stylesheet.block.css */
.link                 { color: gray; }
.link[loading]  { color: yellow; }
.link[active]   { color: green; }
.link[disabled] { color: red; }
```

```hbs
{{!-- template.hbs --}}
{{link-to "route-name" class="link"}}
```
