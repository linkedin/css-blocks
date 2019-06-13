---
name: Class Selectors
title: Class Selectors
---

Where `:scope` styles the root element of a DOM subtree, classes are use to style all elements inside of it.

These are simple written as `.class` selectors, but at build time we guarantee they are local to the Block file they are defined in, and isolated from all other similarly named classes in other Blocks.

A best practice when authoring with CSS Blocks is to use nouns for your class names. If your inclination is to use an adjective or verb then that style probably wants to be a state for one or more of the block's classes.
Classes may **only** be applied to elements inside the DOM subtree where their Block's `:scope` has been applied.

> **Remember: One element, one class per block.**
>
> When applying styles in your template, every element may only receive **one** class from a given Block.

Together, the `:scope` selector and all declared `.class` selectors define the collection of possible types of HTML elements that can participate in the Block's overall design.

```css
:scope    { /* ... */ }
.my-input { /* ... */ }
.icon     { /* ... */ }
```

```handlebars
<div> {{!-- :scope automagically applied, thanks conventions! --}}
  <figure class="icon">
  <input class="my-input">
</div>
```
