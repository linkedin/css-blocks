---
name: Ember Built-Ins
title: Ember Built-Ins
---

Ember has a number of built-in helpers that generate HTML elements under the hood: `{{link-to}}`, `{{input}}`, and `{{textarea}}`. CSS Blocks handles styling these three helpers in slightly different ways.

## Link-To Helper

The built-in `{{link-to}}` helper has been special cased by the CSS Blocks Ember rewriter to support the `class` attribute, and three optional `[state]` selectors. Under the hood, `{{link-to}}` will apply these states as your application routes between different pages, or when you toggle the `disabled` attribute:

```css
.my-link { /* ... */ }
.my-link[state|active] { /* ... */ }
.my-link[state|loading] { /* ... */ }
.my-link[state|disabled] { /* ... */ }
```

```handlebars
{{#link-to "application.route" class="my-link"}}Click Me{{/link-to}}
```

## Input Helpers

CSS Blocks does not support styling the `{{input}}` and `{{textarea}}` helpers. It is recommended that you instead abide by best practice and instead use the native `<input>` and `<textarea>` tags. You may then style these like any other HTML element.