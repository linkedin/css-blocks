---
name: Selector Rules
title: Restrictions on Complexity
---

## Its Just CSS!™️ (mostly)

CSS Blocks implements a **strict subset of CSS**. This means we've intentionally restricted some of the features you're allowed to use in a Block file to ensure we can optimize your stylesheets as much as possible!

Of course, because we statically analyze and compile all your code before it ever hits the browser, you will get a helpful error if any of these syntax restrictions are violated.

> As Opticss improves, we may choose to loosen some of these restrictions – keep an eye out for syntax updates as we approach the `v1.0.0` release!

Lets quidly review these forbidden rules:

#### 1) ❌ `!important`
The `!important` directive is one of CSS' most obvious code smells. It also does some gnarly things to the cascade, especially
when trying to guarantee scoped stylesheets.

#### 2) ❌ `tag`, `[attribute]`, `#id` and `*` Selectors
`tag`, regular `[attribute]` `#id` and `*` selectors are rather difficult to statically analyze. Lucky, they're also not particularly needed with the expressiveness of `:scope` `.class` and `[state]` selectors! We're always looking for ways to improve the optimizer, so as we build more flexibility into Opticss and the Template Analyzers, we may choose to allow more verbose selector options.

#### 3) ❌ The [Logical Combinators](https://www.w3.org/TR/selectors-4/#logical-combination)
Similar to above, these logical combinators (:matches()`, `:not()`, `:something()` and `:has()`) are difficult to analyze! However, we're looking to enable these logical combinators in the near future. Stay tuned.

## One More Requirement: **Shallow Selectors**

CSS Blocks enforces simplicity in your stylesheets by requiring you to use **Shallow Selectors**. Overly complex
CSS selectors are a pretty blatant code smell and are often the result of unnessicarily clevar code. To promote best practices and easy-to-read CSS, we enforce three selector complexity rules at build time:

#### 1) ✅ Only one [combinator](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Combinators_and_multiple_selectors) per selector.

```css
/* ✅ Allowed! Only one combinator. */
:scope:hover > .my-class { /* ... */ }

/* ❌ Illegal! More than one combinator used. */
:scope:hover > .my-class + .my-class { /* ... */ }
```

#### 2) ✅ The Hierarchical Combinators' ([" "](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_selectors) and "[>](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_selectors)") left side selector must be the `:scope`.

```css
/* ✅ Allowed! `:scope` is the originating element on the left side. */
:scope:hover .my-class { /* ... */ }
:scope[state|active] > .my-class { /* ... */ }
:scope[state|color=red] .my-class { /* ... */ }

/* ❌ Illegal! Left side's originating element is not `:scope` */
.container:hover > .my-class { /* ... */ }
.container[state|active] .my-class { /* ... */ }
.container[state|color=red] .my-class { /* ... */ }
```

#### 3) ✅ The Sibling Combinators' ("[+](https://developer.mozilla.org/en-US/docs/Web/CSS/Adjacent_sibling_selectors)", "[~](https://developer.mozilla.org/en-US/docs/Web/CSS/General_sibling_selectors)") left and right sides must target the same originating element.

```css
/* ✅ Allowed! */
.my-class + .my-class { /* ... */ }
.my-class:hover ~ .my-class { /* ... */ }
.my-class[state|active] + .my-class { /* ... */ }
:scope[state|active] ~ :scope { /* ... */ }


/* ❌ Illegal! */
:scope + .my-class { /* ... */ }
.another-class:hover ~ .my-class { /* ... */ }
.another-class[state|active] + .my-class { /* ... */ }
```

> 💡 **Feature Note: Global States and Selectors**
> 
> "Global States" have their own rules on how they can be used in Block selectors! Keep an eye out for them a little later in this doc.


## Freedom 🎉

Good news though! Other than these six major restrictions, you are free to use the remaining features of CSS that you know and love. These include:

 - `::before`, `::after`, and [all other pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements)
 - `:hover`, `:active`, and [all other pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes),
 - `@media`, `@breakpoint`, and [all other `@at-rules`](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule)
 - The **cascade** and **selector specificity**.
 - **Progressive enhancement** and **graceful degradation**.