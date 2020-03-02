
# Features

CSS Blocks is under active development, however the current supported feature set is as follows:

| **Feature** | **Description** |
|:--:|:--|
| **Selectors** ||
| `:scope` | Scope selector for component root. |
| `.class` | Class selectors for component sub-elements. |
| `.class[name]` | State that is applied to scope and class selectors on state existence. |
| `.class[name="value"]` | Mutually exclusive sub-states for scope and class selectors to be applied when a sub-state value matches. |
| **At Rules** ||
| `@block local-name from "./file/path.css"` | Reference another Block using a local name. |
| `@block-debug block-name to channel` | Debug call that will print a block interface to a "channel": `comment`, `stderr`, or `stdout`. |
| `@block-global block.path` | Declare a Block class or state as public. It may be used as a context selector in other Blocks. |
| **Properties** ||
| `block-name: "custom-name";` | Provide custom Block names in `:scope` for a nicer debugging experience. |
| `implements: block-name;` | A Block can declare that it implements one or more other Block's interfaces in its `:scope` selector and the compiler will ensure that all of those states and classes are styled locally. |
| `extends: block-name;` | A Block may specify it extends another Block in its `:scope` selector to inherit and extend all the class and state implementations therein. |
| `composes: "block.path";` | Mixin-Style class and state composition. Apply other Blocks' Styles to one of yours.  |
| **Functions** ||
| `resolve("block.path");` | Provide an explicit resolution for a given property against another Block. |

## Its Just CSS!™️ (mostly)

CSS Blocks implements a **strict subset of CSS**. This means we've intentionally restricted some of the features you're allowed to use in a Block file to ensure we can optimize your stylesheets as much as possible!

### 🎉 That means you may freely use:

 - `::before`, `::after`, and [all other pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements)
 - `:hover`, `:active`, and [all other pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes),
 - `@media`, `@breakpoint`, and [all other `@at-rules`](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule)
 - The **cascade** and **selector specificity**.
 - **Progressive enhancement** and **graceful degradation**.

### 🚨 However:

 - `!important` is **forbidden** – you won't be needing it.
 - The `tag`, non-state `[attribute]`, `#id` and `*` selectors are **not allowed**.
 - The [Logical Combinators](https://www.w3.org/TR/selectors-4/#logical-combination) `:matches()`, `:not()`, `:something()` and `:has()` are **not allowed**.
 - Selectors must remain **shallow**.

In css-blocks, **shallow selectors** mean:

#### 1) Only one [combinator](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Combinators_and_multiple_selectors) per selector.

```css
/* ✅ Allowed! */
:scope:hover > .my-class { /* ... */ }

/* ❌ Not Allowed! */
:scope:hover > .my-class + .my-class { /* ... */ }
```

#### 2) The Hierarchical Combinators' ([" "](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_selectors) and "[>](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_selectors)") context selector must be a `:scope` states, sub-states, or pseudo-classes.

```css
/* ✅ Allowed! */
:scope:hover .my-class { /* ... */ }
:scope[active] > .my-class { /* ... */ }
:scope[color=red] .my-class { /* ... */ }

/* ❌ Not Allowed! */
.container:hover > .my-class { /* ... */ }
.container[active] .my-class { /* ... */ }
.container[color=red] .my-class { /* ... */ }
```

#### 3) The Sibling Combinators' ("[+](https://developer.mozilla.org/en-US/docs/Web/CSS/Adjacent_sibling_selectors)", "[~](https://developer.mozilla.org/en-US/docs/Web/CSS/General_sibling_selectors)") context selector must target the **same class or `:scope`** used in the key selector.

```css
/* ✅ Allowed! */
.my-class + .my-class { /* ... */ }
.my-class:hover ~ .my-class { /* ... */ }
.my-class[active] + .my-class { /* ... */ }

/* ❌ Not Allowed! */
:scope + .my-class { /* ... */ }
.another-class:hover ~ .my-class { /* ... */ }
.another-class[active] + .my-class { /* ... */ }
```

> 💡 **Feature Note: Global States and Selectors**
>
> "Global States" have their own rules on how they can be used in Block selectors! Keep an eye out for them a little later in this doc.

Of course, because we statically analyze and compile all your code before it ever hits the browser, you will get a helpful error if any of these syntax restrictions are violated.
