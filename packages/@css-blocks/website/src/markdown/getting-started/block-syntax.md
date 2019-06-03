
# 🎨 What is a Block?
A "Block" is an isolated stylesheet, written in its own file, that contains all rulesets for any elements, and their various modes and interaction states, for a discrete unit of styling – like a component or design pattern.

Typically, a single Block will contain styles for a particular component or concept, but it is entirely natural – and encouraged – for a template to consume multiple blocks and compose them together in the markup.

A Block file may contain:

## The Scope Selector
The scope ruleset contains styles applied to the root of the scoped style subtree. All other elements assigned styles from a Block must be contained in the document subtree of an element assigned to the block's :scope. We use the special [`:scope` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope) to represent these styles.

The `:scope` selector may contain the special `block-name` property so you may provide your own Block name for easy debugging and BEM class generation. If no `block-name` is provided, we will infer the Block name from the file name.

> 💡 **Feature Note: Block Names**
>
> If two Blocks in your project have the same name, CSS Blocks will automatically generate a unique, but still human-readable, name for BEM output mode.

```css
:scope { 
  block-name: custom-block-name; 
  /* 👆 optional! */
  /* ... more styles ... */
}
```

## Class Selectors
Blocks may can contain other classes that may be applied to elements inside the scoped style sub-tree. These are just class selectors, but they are local to that Block and isolated from all other similarly named classes in other Blocks.

```css
.sub-element { /* ... */ }
.other-sub-element { /* ... */ }
```

Together, the `:scope` selector and all declared `.class` selectors define the full interface of stylable elements available to a Block's consumer.

## State Selectors
States represent a mode or interaction state that the `:scope` or a class – called the state's **originating element** – may be in. States are written as attribute selectors with the special `state` namespace.

```css
:scope { /* ... */ }
:scope[state|enabled] { /* ... */ }

.sub-element { /* ... */ }
.sub-element[state|is-active] { /* ... */ }
```

> **⁉️ What the pipe is going on here?**
>
> Once upon a time, developers fell in love with XML and thus was born xhtml, a flavor of HTML that allowed HTML elements to be mixed together with elements from other XML syntaxes like SVG and MathML. CSS went along for the ride and so, while many have never seen or used the feature, CSS has support for namespaced elements and attributes. In CSS, the `|` symbol is used to delimit between a namespace identifier (assigned by the `@namespace` at-rule) and the element or attribute name (also called a [qualified name](https://drafts.csswg.org/css-namespaces-3/#css-qualified-name)).
>
> In markup, instead of a pipe symbol, the colon is used to delimit a namespace identifier and a qualified name. Yes, this is confusing -- but we don't make CSS syntax, we just use it.

## Sub-State Selectors
States on the `:scope` selector or a class selector may contain sub-states for more granular styling. Sub-states of a State are **mutually exclusive** and an element may only be in one sub-state of that state at any given time.

```css
:scope { /* ... */ }
:scope[state|theme="inverse"] { /* ... */ }

.sub-element { /* ... */ }

/* Applied for *any* value of `color`, including no value. */ 
.sub-element[state|color] { /* ... */ }

/* Applied for *specific* values of `color */
.sub-element[state|color="red"] { /* ... */ }
.sub-element[state|color="blue"] { /* ... */ }
.sub-element[state|color="yellow"] { /* ... */ }
```

## Its Just CSS!™️ (mostly)

CSS Blocks implements a **strict subset of CSS**. This means we've intentionally restricted some of the features you're allowed to use in a Block file to ensure we can optimize your stylesheets as much as possible! 

> As Opticss improves, we may choose to loosen some of these restrictions – keep an eye out for syntax updates as we approach the `v1.0.0` release!

### 🎉 That means you may freely use:

 - `::before`, `::after`, and [all other pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements)
 - `:hover`, `:active`, and [all other pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes),
 - `@media`, `@breakpoint`, and [all other `@at-rules`](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule)
 - The **cascade** and **selector specificity**.
 - **Progressive enhancement** and **graceful degradation**.

### 🚨 However:

 - `!important` is **forbidden** – you won't be needing it!
 - The `tag`, non-state `[attribute]`, `#id` and `*` selectors are **forbidden** (for now!)
 - The [Logical Combinators](https://www.w3.org/TR/selectors-4/#logical-combination) `:matches()`, `:not()`, `:something()` and `:has()` are **forbidden** (for now!)
 - Selectors must remain **shallow**.

In css-blocks, **shallow selectors** mean:

#### 1) Only one [combinator](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Combinators_and_multiple_selectors) per selector.

```css
/* ✅ Allowed! */
:scope:hover > .my-class { /* ... */ }

/* ❌ Illegal! */
:scope:hover > .my-class + .my-class { /* ... */ }
```

#### 2) The Hierarchical Combinators' ([" "](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_selectors) and "[>](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_selectors)") context selector must be a `:scope` states, sub-states, or pseudo-classes.

```css
/* ✅ Allowed! */
:scope:hover .my-class { /* ... */ }
:scope[state|active] > .my-class { /* ... */ }
:scope[state|color=red] .my-class { /* ... */ }

/* ❌ Illegal! */
.container:hover > .my-class { /* ... */ }
.container[state|active] .my-class { /* ... */ }
.container[state|color=red] .my-class { /* ... */ }
```

#### 3) The Sibling Combinators' ("[+](https://developer.mozilla.org/en-US/docs/Web/CSS/Adjacent_sibling_selectors)", "[~](https://developer.mozilla.org/en-US/docs/Web/CSS/General_sibling_selectors)") context selector must target the **same class or `:scope`** used in the key selector.

```css
/* ✅ Allowed! */
.my-class + .my-class { /* ... */ }
.my-class:hover ~ .my-class { /* ... */ }
.my-class[state|active] + .my-class { /* ... */ }

/* ❌ Illegal! */
:scope + .my-class { /* ... */ }
.another-class:hover ~ .my-class { /* ... */ }
.another-class[state|active] + .my-class { /* ... */ }
```

> 💡 **Feature Note: Global States and Selectors**
> 
> "Global States" have their own rules on how they can be used in Block selectors! Keep an eye out for them a little later in this doc.

Of course, because we statically analyze and compile all your code before it ever hits the browser, you will get a helpful error if any of these syntax restrictions are violated.
