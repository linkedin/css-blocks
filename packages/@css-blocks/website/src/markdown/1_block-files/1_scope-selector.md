---
name: The Scope Selector
title: The Scope Selector
---

Every Block file represents a scoped stylesheet. The styles defined therein are meant to **only** be applied to a specific DOM subtree – typically a single component's internals. The `:scope` ruleset contains styles to be applied to the root of the scoped style subtree.

All other elements assigned styles from this Block must be contained inside the DOM subtree of the element we've assigned the Block's :scope. We use the special [`:scope` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope) to represent these styles.

Each template integration has a slightly different method designating the root of a scoped style tree. Below we demonstrate the JSX integration.

```css
:scope {
  color: red;
  background: blue;
}
```

```jsx
import block from "./styles.block.css";

export const render = () => (
  <div className={block}>
    <p>{"I'm red, my parent's background is blue."}</p>
  </div>
);
```

## `:scope` Special Directives

There exist a number of special CSS Blocks directives that are only allowed to be used in a Block's `:scope` selector. These directives, written as custom CSS properties, control behavior associated with the Block itself. These properties are:

 - `block-name`
 - `extends`
 - `implements`

 ### Block Name

The `:scope` selector may contain the special `block-name` property so you may provide your own Block name for easy debugging and BEM class generation. If no `block-name` is provided, we will infer the Block name from the file name.

> 💡 **Feature Note: Block Names**
>
> If two Blocks in your project have the same name, CSS Blocks will automatically generate a globally unique, but still human-readable, name in developer output mode.

```css
:scope {
  block-name: custom-block-name; 
  /* 👆 optional! */
  /* ... more styles ... */
}
```

### Extends and Implements

Well you eager beaver, now we're getting ahead of ourselves! `extends` and `implements` are meaty enough features that they deserve their own section. We'll cover these on the [Block Inheritance](/learn/block-files/inheritance) page.