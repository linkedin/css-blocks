---
name: Class Selectors
title: Class Selectors
---

Where `:scope` styles the root element of a DOM subtree, classes are use to style all elements inside of it.

These are simple written as `.class` selectors, but at build time we guarantee they are local to the Block file they are defined in, and isolated from all other similarly named classes in other Blocks.

Classes may **only** be applied to elements inside the DOM subtree where their Block's `:scope` has been applied.

> **Remember: Once element, one class.**
>
> When applying styles in your template, every element may only receive **one** class from a given Block.

Together, the `:scope` selector and all declared `.class` selectors define the full interface of stylable elements available to a Block's consumer.

```css
:scope    { /* ... */ }
.my-input { /* ... */ }
.icon     { /* ... */ }
```

```handlebars
<div> {{!-- Scope automagically applied, thanks Glimmer! --}}
  <figure class="icon">
  <input class="my-input">
</div>
```