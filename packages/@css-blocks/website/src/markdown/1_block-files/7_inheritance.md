---
name: Inheritance
title: Block Inheritance Model
---

One of the most basic ways your Block can interact with an imported Block is to `implement` or `extend` the other Block.
In this section we'll look at the inheritance model used by CSS Blocks to enable true object oriented CSS.

## Block Implementation
A Block's public interface is defined by the classes, states, and sub-states it defines. Any Block may declare that it `implements` the interface of one or more other referenced Blocks' interfaces.

At build time, the compiler will ensure that all the states and classes the remote Block defines are present on the implementing Block. In this way, the compiler can guarantee it is safe to use different Blocks to style the same markup in a component.

Blocks can designate implementation via the special `implements` property in a Block's `:scope` selector:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[state|my-state] { /* ... */ }
```

```css
/* block-2.block.css */
@block other-block from "./block-1.block.css";

:scope { 
  block-name: block-2; 
  implements: other-block;
}
```

> 💡 **Feature Note: Implements Property**
>
> The `implements` property is only available in the `:scope` ruleset. If you use it in any other ruleset, it will be ignored.

However, the above code will throw an error at build time!

```bash
$ Error: Missing implementations for .my-class, .my-class[state|my-state] from ./block-1.block.css
```

For the build to pass, we need to implement the *full public interface* of `block-1` in `block-2`:

```css
/* block-2.block.css */
@block other-block from "./block-1.block.css";

:scope { 
  block-name: block-2; 
  implements: other-block;
}
.my-class { /* ... */ }
.my-class[state|my-state] { /* ... */ }
```

### Block Inheritance

A Block may also choose to extend another referenced Block. This exposes all declared styles from the extended Block on the extending Block. 

Those inherited styles may then be used in a template by accessing them on the extending block, and can even be augmented by re-declaring the styles in the extending block!

You do this via the special `extends` property in a Block's `:scope` selector. 

Lets say we have a component called `<basic-form>`. Basic forms have an input element, and a big green button. Simple enough:

```css
/* basic-form.block.css */
.button { 
  font-size: 1.4rem;
  color: white;
  background-color: green;
}
.button[state|disabled] {
  color: #333;
  background-color: lightgray;
}
.input { font-weight: bold }
```

But, as the project evolves we realize we need a new form for submitting information for a dangerous action, we're asked to create a new kind of form called `<danger-form>`. Danger forms look and function exactly the same as a basic form, except the button and labels are red. We *could* re-implement the entire stylesheet to create `<danger-form>`, but that would be a such a waste of all the hard work we already put in to `<basic-form>`!

Instead, we can simply extend the `<basic-form>` Block, and only apply the small style changes we need:

```css
/* danger-form.block.css */
@block basic-form from "./basic-form.block.css";

:scope  { extends: basic-form; }
.button { background-color: darkred; }
.label  { color: darkred; }
```

> 💡 **Feature Note: Extends Property**
> 
> The `extends` property is only available in the `:scope` selector. If you use it in any other selector, it will be ignored.

An extending block is able to re-define any property on any style it inherits from. CSS declarations defined in the extending Block will **always** take priority over the definitions inherited by the same named Style in the base Block.

> 🔮 **Future Feature: Extension Constraints**
> 
> Sometimes, properties inside of a component are **so** important, that authors may want to constrain the values that extenders and implementors are able to set. In the near future, css-blocks will enable this use case through the custom `constrain()` and `range()` CSS functions and possibly through other ideas like [custom constraints and conflicts](https://github.com/linkedin/css-blocks/issues/51). You can come help out over on Github to make this happen faster!
