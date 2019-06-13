---
name: State Selectors
title: State Selectors
---

The last piece in our CSS Blocks selector toolkit is the `[state]` selector.

States represent a mode or interaction that any `:scope` or `.class` may assume.

> **Vocab: Originating Element**
>
> The element that a `[state]` modifies is called the **Originating Element**.

States are written as CSS attribute selectors with the special `state` namespace.

```css
:scope                { /* ... */ }
:scope[state|enabled] { /* ... */ }

.sub-element                  { /* ... */ }
.sub-element[state|is-active] { /* ... */ }
```

> **!? What the pipe is going on here?**
>
> You may have noticed an odd looking `|` character in that attribute selector up there.
>
> Once upon a time, developers fell in love with a language called XML and wanted to use it for structured data on the web. Thus was born xhtml, a flavor of HTML that allowed HTML elements to be mixed together with elements from other XML syntaxes like SVG and MathML. CSS went along for the ride too, and so, while many have never seen or used the feature, the CSS language has support for namespaced elements and attributes. In CSS, the `|` symbol is used to delimit between a namespace identifier (assigned by the `@namespace` at-rule) and the element or attribute name (also called a [qualified name](https://drafts.csswg.org/css-namespaces-3/#css-qualified-name)).
>
> Fun fact: In markup, instead of a pipe symbol, the colon is used to delimit a namespace identifier and a qualified name. Yes, this is confusing – but we don't make CSS syntax, we just use it.

In your templates, it is easy to reason about `[state]` as if they are actual HTML attributes. For example, in Glimmer you literally represent state application as an HTML attribute:

```handlebars
<div>
  <div class="sub-element" state:is-active={{isActive}}></div>
</div>
```

In the above example, the `.sub-element` originating element is placed in the `[state|is-active]` state when `isActive` is truthy.

## Sub-State Selectors

Much like any other HTML attribute selector, `[state]` selectors may define a specific value under which the ruleset's styles are to be applied. We call this value a **sub-state**

It is important to note that the sub-states of a `[state]` are **Mutually Exclusive**. An element may only be in one sub-state at any given time. Unlike **sub-states**, each individual `[state]` is not **Mutually Exclusive**, and may be mixed and matched.

```css

/* The Originating Element for all states defined below. */
.sub-element { /* ... */ }

/*
 * The `active` state may be applied in conjunction with `color`.
 * States themselves are not mutually exclusive
 */
.sub-element[state|active] { /* ... */ }

/* Applied for *any* value of `color`, including no value. */
.sub-element[state|color] { /* ... */ }

/*
 * Applied for *specific* values of `color`.
 * Just like normal HTML Attributes, sub-states are mutually exclusive.
 */
.sub-element[state|color="red"]    { /* ... */ }
.sub-element[state|color="blue"]   { /* ... */ }
.sub-element[state|color="yellow"] { /* ... */ }
```

```handlebars
  <div class="sub-element" state:active={{isActive}} state:color={{currentColor}} />
```

> 🔮 **Future Feature: Fuzzy Sub-State Matching**
>
> In the future, CSS Blocks may support all the matching variants of the attribute selector.
>
> Ex: `:scope[state|color^="red"]` could match both sub-state values `"red"` and `"redgreen"`.
> For now, only full equality is supported.
>
> Interested in implementing this? Find us on GitHub!


> 🔮 **Future Feature: Default Sub-State Application**
>
> In the future, CSS Blocks may support designating a sub-state as the fallback ruleset if no
> other sub-states match.
>
> Ex: `:scope[state|color="red" d]` would match if an invalid state value is provided at runtime,
> or when no substate is applied.
>
> Interested in implementing this? Find us on GitHub!


> 🔮 **Future Feature: Bare State Selectors**
>
> In the future, CSS Blocks may support the ability to define `[state]` selectors with no Originating
> Element. In these cases, the `[state]` and its sub-states may be used by any element in the subtree,
> including the root.
>
> For example:
> ```css
> :scope         { color: red; }
> .el            { color: blue; }
> [state|active] { color: green; }
> ```
> ```handlebars
>  <div state:active={{isRootActive}}>
>    I'm green when isRootActive is true.
>    <div state:active={{isElActive}}>
>      I'm green when isElActive is true.
>    </div>
>  </div>
> ```
> Interested in implementing this? Find us on GitHub!
