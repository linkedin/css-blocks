<p align="center">
  <img alt="CSS Blocks" width="480px" src="http://css-blocks.com/images/wordmark.svg" />
</p>
<h2 align="center">Blazing fast CSS for your Design Systems and App Components </h2>

[![Build Status](https://travis-ci.com/linkedin/css-blocks.svg?token=StHPTowsdWydAGro7djA&branch=master)](https://travis-ci.com/linkedin/css-blocks)

---

CSS Blocks is an ergonomic, component-oriented CSS authoring system that compiles to high-performance stylesheets.

By combining an opinionated authoring system, build-time analysis and rewriting of templates, and a new type of CSS optimizer, css-blocks breathes new power and ease of use into the technologies and best practices that stylesheet developers already know and love.

> Interested in contributing, or just seeing CSS Blocks in action? Head over to [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to spin up the project!

<details>
  <summary>Table of Contents</summary>

<!-- toc -->

- [Why CSS Blocks?](#why-css-blocks)
  * [The ⚡️ of Static Analysis](#the-️-of-static-analysis)
- [⚙️ Supported Integrations](#️-supported-integrations)
- [🎁 API Features](#-api-features)
- [🎨 What is a Block?](#-what-is-a-block)
  * [The Scope Selector](#the-scope-selector)
  * [Class Selectors](#class-selectors)
  * [State Selectors](#state-selectors)
  * [Sub-State Selectors](#sub-state-selectors)
  * [Its Just CSS!™️ (mostly)](#its-just-css️-mostly)
  * [Blocks in Your Templates](#blocks-in-your-templates)
- [🏗 Block Composition](#-block-composition)
  * [Block References](#block-references)
- [Object Oriented Features of Blocks](#object-oriented-features-of-blocks)
  * [Block Implementation](#block-implementation)
- [Style Composition](#style-composition)
  * [Block Paths](#block-paths)
  * [Composition in Templates](#composition-in-templates)
  * [Block Resolutions](#block-resolutions)
  * [External Selectors](#external-selectors)
  * [Global States](#global-states)

<!-- tocstop -->

</details>

# Why CSS Blocks?
With css-blocks added to your project, you receive:
 
 - 💎 One CSS File Per Component
 - 📦 Scoped Styles
 - 🔎 Nearly Non-Existent Runtime (~500b)
 - 🔥 Blazing Fast Stylesheets
 - 🚀 Project-Wide Optimization
 - 🚨 Build Time CSS Errors
 - 🧟 Dead Code Elimination
 - ✨ Object Oriented Inheritance

But, most importantly, CSS Blocks is **⚡️Statically Analyzable**.

## The ⚡️ of Static Analysis
Static analysis means css-blocks can look at your project and know with *certainty* that any given CSS declaration will, will not, or might under certain conditions, be used on any given element in your templates. 

Most stylesheet architectures have to walk a fine line between performance and
maintainability. Tilt too far in either direction and either your users or the developers
will end up paying the cost. With CSS Blocks, you can focus on making sure your
stylesheets are easy to maintain as your application changes, and with the new
CSS optimizer, [OptiCSS](https://github.com/linkedin/opticss), the small size of your
app's production stylesheets after compression will amaze you.

Gone are the days where you spend several minutes debugging your app only to discover a subtle typo that caused a selector to not match – CSS Blocks will give you a build error and suggest possible fixes. With IDE integration, projects using CSS Blocks will be able to quickly navigate to selector definitions that match your current template element and find which template elements match your current selector, autocomplete class names. With CSS Blocks new resolution system, cascade conflicts will be caught for you before you even know they exist and you will never have to fight a specificity war ever again.

![CSS Blocks Example](https://user-images.githubusercontent.com/7856443/39090683-78ca1966-459a-11e8-8128-f50a9b2a1810.jpg)

> CSS Blocks is inspired by [CSS Modules](https://github.com/css-modules/css-modules), [BEM](http://getbem.com/) and [Atomic CSS](https://acss.io/)
> 
> For a full deep-dive of the project architecture, I heavily recommend you review the [CSS Blocks Architecture README](./ARCHITECTURE.md)!

# ⚙️ Supported Integrations

CSS Blocks requires deep integration with your build system and templating language. To learn how to install css-blocks for in your application, please consult the specific docs for your templating system and build system.

CSS Blocks is available for use in the following templating languages:

 - [JSX / React][JSX]
 - [Glimmer][GLIMMER]

And has integrations with the following build systems:

 - [Webpack][WEBPACK]
 - [Broccoli][BROCCOLI]
 - [Ember-CLI][EMBER_CLI] (Glimmer Only)

> Don't see your preferred platform yet? 
>
> Learn how to make your own [Template Integration](./ARCHITECTURE.md#template-integrations) or [Build System Integration](./ARCHITECTURE.md#build-system-integrations) and contribute it back!

# 🎁 API Features

CSS Blocks is under active development and there are a number of features that have not yet been implemented! You can get a snapshot of the feature-set state here.

> ✅ = Implemented  |  ❌ = Not Implemented  |  💀 = Deprecated  |  🖌 = In Proposal  |

|**Status**| **Feature** | **Description** |
|:--:|:--|:--|
| **Selectors** ||
| ✅ | `:scope` | Scope selector for component root. |
| ✅ | `.class` | Class selectors for component sub-elements. |
| ✅ | <code>.class[state&#124;name]</code> | State that is applied to scope and class selectors on state existence. |
| ✅ | <code>.class[state&#124;name="value"]</code> | Mutually exclusive sub-states for scope and class selectors to be applied when a sub-state value matches. |
| ❌ | <code>[state&#124;name=value]</code> | Bare state (not associated with an Originating Element) and optional substate selectors for targeting all elements in the Block that possess the state an/or sub-state. |
| 🖌 | <code>.class[state&#124;name default]</code> | Default state value to be applied when there is no other match. |
| **At Rules** ||
| ✅ | `@block-reference local-name from "./file/path.css"` | Reference another Block using a local name. |
| ✅ | `@block-debug block-name to channel` | Debug call that will print a block interface to a "channel": `comment`, `stderr`, or `stdout`. |
| ✅ | `@block-global block.path` | Declare a Block class or state as public. It may be used as a context selector in other Blocks. |
| 🖌 | `@is-block block-name` | Block class can declare itself to be the root of another block in a specific state or set of states.  |
| **Properties** ||
| ✅ | `block-name: "custom-name";` | Provide custom Block names in `:scope` for a nicer debugging experience. |
| ✅ | `implements: block-name;` | A Block can declare that it implements one or more other Block's interfaces in its `:scope` selector and the compiler will ensure that all of those states and classes are styled locally. |
| ✅ | `extends: block-name;` | A Block may specify it extends another Block in its `:scope` selector to inherit and extend all the class and state implementations therein. |
| 🖌 | `apply: "block.path";` | Mixin-Style class and state composition. Apply other Blocks' Styles to one of yours.  |
| **Functions** ||
| ✅ | `resolve("block.path");` | Provide an explicit resolution for a given property against another Block. |
| ❌ | `constrain(val1, val2 ... valN);` | Constrain this property to a list of specific values that may be set when this Block is extended. |
| ❌ | `range(min, max);` | Constrain this property to a range of values that may be set when this Block is extended.  |

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

## Blocks in Your Templates
Every specific template integration with css-blocks will have their own slightly unique syntax for how to interface with Block files. However, they all will allow you to apply classes and states in a way that is analyzable and rewritable at build time.

> 💡 **Feature Note: Template Integrations**
> 
> Each integration implements a slightly different API. Ex: JSX lets you `import` Block files, Ember looks for, through convention, a `stylesheet.css` alongside every component template. Check out the README for your template language for full details.

However, whatever the implementation is, it will feel as though you're interfacing with regular CSS on the platform. For example, in Glimmer you just write the classes and states exactly as you would expect when working with a normal stylesheet:

```css
:scope { /* ... */ }
:scope[state|enabled] { /* ... */ }
.button { /* ... */ }
.icon { /* ... */ }
.icon[state|inverse] { /* ... */ }
```

```hbs
{{!-- :scope selector is automagically applied to the template's root-level element. Thanks Glimmer! --}}
<section state:enabled={{isEnabled}}>
  <button class="button">
    <div class="icon" state:inverse={{isInverse}}></div>
    {{value}}
  </button>
</section>
```

There are only two (2) common-sense rules to follow when using Block styles in your template:

 1. You **may not** use a Block class outside of it's `:scope`'s subtree.
 2. Two classes *from the same Block* **may not** be applied to the same HTML element.

# 🏗 Block Composition
Blocks styles are, by design, scoped to the file they are written in, but we all know that in a real app your styles can't live in a vacuum! 

As you'll see below, there are many methods to compose blocks together in your application. However, most of these methods will begin with the humble `@block-reference`.

## Block References
A Block may declare a dependency on another Block by using a `@block-reference` at the top of your file. A `@block-reference` creates a locally scoped alias where you can access the public API (declared classes and states) of the referenced block.

Block references don't cause any styles to be included. Instead, they are like an ES6 `import` statement -- they make it possible to refer to the public interface of another Block from within the current Block. 

Adding a `@block-reference` is as simple as this:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[state|my-state] { /* ... */ }
```

```css
/* block-2.block.css */
@block-reference other-block from "./block-1.block.css";

:scope { block-name: block-2; }
```

> 🔮 **Future Feature: Node Modules Block Resolution **
>
> Whether you're integrating with a 3rd party library, or pulling in dependencies internal to your company, at some point you'll want to integrate with styles delivered via NPM! The resolution logic for `@block-reference`s to `node_modules` hasn't yet been implemented yet, but you can track progress (or even help out!) [over on Github](https://github.com/linkedin/css-blocks/issues/112).

With the above code, `block-2` now has a local reference `other-block` which points to `block-1`. We can now freely use the `other-block` identifier inside of `block-2` when we want to reference reference `block-1`. This comes in handy! Especially with features like:

# Object Oriented Features of Blocks

## Block Implementation
A Block's public interface is defined by the states and classes it styles. A block may declare that it implements one or more other referenced blocks' interfaces, and the compiler will ensure that all the states and classes it defines are also in the implementing block. In this way, the compiler can guarantee it is safe to use different blocks to style the same markup in a component.

You do this via the special `implements` property in a Block's `:scope` selector:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[state|my-state] { /* ... */ }
```

```css
/* block-2.block.css */
@block-reference other-block from "./block-1.block.css";

:scope { 
  block-name: block-2; 
  implements: other-block;
}
```

> 💡 **Feature Note: Implements Property**
>
> The `implements` property is only available in the `:scope` selector. If you use it in any other selector, it will be ignored.

However, the above code will throw an error at build time!

```bash
$ Error: Missing implementations for .my-class, .my-class[state|my-state] from ./block-1.block.css
```

For the build to pass, we need to implement the *full public interface* of `block-1` in `block-2`:

```css
/* block-2.block.css */
@block-reference other-block from "./block-1.block.css";

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
@block-reference basic-form from "./basic-form.block.css";

:scope  { extends: basic-form; }
.button { background-color: darkred; }
.label  { color: darkred; }
```

During rewrite, references to an inherited style will translate into the class(es) for the
directly referenced style as well as all the classes that it inherits from so developers do
not need to bring the complexity of the inheritance relationship into their templates.
For example, a reference to `danger-form.button` would result in adding both `.basic-form__button`,
as well as `.danger-form__button` to the element's list of classes.

When the blocks are compiled, property overrides are detected and automatically resolved.
The selectors generated serve two purposes:

1. Concatenation order independence - Once compiled, a CSS block file can be
   concatenated in any order with other compiled block output.
2. Optimization hints - Normally, if there are selectors with the same
   specificity that set same property to different values on the same element,
   the optimizer would take care not to merge those declarations such that it
   might cause a cascade resolution change. But the selectors in the output from
   CSS Blocks allows OptiCSS to merge declarations more aggressively, because it
   can prove that it knows the value of those selectors when combined.

```css
.basic-form__button { font-size: 1.4rem; color: white; background-color: green; }
.basic-form__button--disabled { color: #333; background-color: lightgray; }
.basic-form__input { font-weight: bold; }
.danger-form__button { background-color: darkred; }
.basic-form__button.danger-form__button { background-color: darkred; }
.danger-form__button--disabled { background-color: #957d7d; }
.basic-form__button.danger-form__button--disabled { background-color: #957d7d; }
.basic-form__button--disabled.danger-form__button--disabled { background-color: #957d7d; }
.danger-form__label { color: darkred; }
```

While this output is highly repetitive and may seem excessive, it's exactly the kind of repetition
that OptiCSS is designed to search for and remove. From an authoring experience and in production,
it's a laser-focused override with no performance impact.

> 💡 **Feature Note: Extends Property**
> 
> The `extends` property is only available in the `:scope` selector. If you use it in any other selector, it will be ignored.

An extending block is able to re-define any property on any style it inherits from. CSS declarations defined in the extending Block will **always** take priority over the definitions inherited by the same named Style in the base Block.

> 🔮 **Future Feature: Extension Constraints**
> 
> Sometimes, properties inside of a component are **so** important, that authors may want to constrain the values that extenders and implementors are able to set. In the near future, css-blocks will enable this use case through the custom `constrain()` and `range()` CSS functions and possibly through other ideas like [custom constraints and conflicts](https://github.com/linkedin/css-blocks/issues/51). You can come help out over on Github to make this happen faster!

# Style Composition

## Block Paths
As your Blocks begin interacting with each other in increasingly complex ways, you will find yourself needing to reference specific classes or states on another Block, as you'll see later in this document. You do this using a small query syntax called a [Block Path](./packages/css-blocks/src/BlockSyntax/BlockPath.ts).

Block Paths take the form: 

```
block.class[state|name='value']
```

All sections of this selector – except the leading Block name – are optional. The leading Block name *must* refer to an imported `@block-reference` at the top of the file. If css-blocks is unable to resolve a Block Path at build time, you will get a friendly error message in your console!

All the following syntaxes are legal to select any given stylable on a referenced Block:

|Stylable|Syntax|
|:--|:--|
|Scope|`block`|
|Scope State|<code>block[state&#124;name]</code>|
|Scope Sub-State|<code>block[state&#124;name=value]</code>|
|Class|`block.class`|
|Scope State|<code>block.class[state&#124;name]</code>|
|Scope Sub-State|<code>block.class[state&#124;name=value]</code>|

> 🔮 **Future Feature: Block Path Wildcards**
> 
> In some situations, you may want to select multiple classes, states or sub-states on a referenced block. In the near future you will be able to do so with a wildcard syntax: `block.*`, `block.class[state|*]`, `block.class[state|name=*]`. Feel free to track progress of this feature [here]()

## Composition in Templates
Every template integration will provide a way to use more than one Block inside of a template. The syntax for this may change depending on your templating system, so please check with your specific template integration's documentation.

For Glimmer, using multiple blocks in a single template will look something like this:

```css
/* hoverable.css */
:scope {
  block-name: hoverable;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
  transition: box-shadow .28s;
}
:scope:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2)
}
.button { 
  background-color: rgba(255, 255, 255, .5);
  color: black;
  transition: background-color .28s;
}
:scope:hover .button {
  background-color: rgba(255, 255, 255, 1);
}
```

```css
/* stylesheet.css */
@block-reference other from "./hoverable.css";

:scope { block-name: main; }
.form {
  border: 1px solid gray;
  border-radius: 2px;
  padding: 16px;
}
.button { 
  background-color: green;
  color: white;
  height: 32px;
  width: 100%;
}
```

```hbs
{{!-- :scope selector from `stylesheet.css` is automagically applied to the template's wrapper element. Thanks Glimmer! --}}
<section>
  <form class="form other">
    <button class="button other.button">Click Me!</button>
  </form>
</section>
```

Above we have a simple template that contains a form with a single button that says "Click Me!". We style it with styles from the default Block for the template, `stylesheet.css`, and with styles from the referenced Block `hoverable.css`, referenced in this context as `other`.

In this template, we have the `<form>` element assigned the scoped root for `other`, and we apply the `button` class from both blocks to the `<button>` element.

But wait! If you try and run the css-blocks build with this code, you'd find an error in your console!

```bash
The following property conflicts must be resolved for these co-located Styles: (template.hbs:4:19)

          color:
            main.button (stylesheet.css:12:2)
            hoverable.button (hoverable.css:12:2)

          background-color:
            main.button (stylesheet.css:11:2)
            hoverable.button (hoverable.css:11:2)
```

Woah, what does this mean?! Well, if we stop and think for a second about what we just asked css-blocks to do, we'll realize that this error makes perfect sense.

Because Blocks have their own entirely independently scoped cascades, and right now no Block file is aware of any other Block's styles, css-blocks doesn't inherently know which Block should take priority over another when used together.

So, when css-blocks was asked to put the `.button` class from both the default template stylesheet, and from `hoverable` onto the same element, it noticed that both classes are claiming to set the `color` and `background-color` properties – and with this we have encountered our first **Indeterminate Cascade Resolution**. 

Which Block should win in this situation? Right now, the compiler has no idea. To answer that, css-blocks needs a little help from you. We are able to provide explicit cross-Block cascade resolutions to the compiler by using `resolve()`. Lets learn how we can fix our above error by moving on to the next section: **Block Resolutions**.

## Block Resolutions
The special `resolve()` function provides explicit resolution guidance for properties that are in conflict across two or more Block files. They look like any other property declaration:

```css
selector {
  property-name: resolve("<block-path>");
}
```

You will be asked by the css-blocks compiler to add resolutions if and when two styles are found on the same element in your templates that attempt to set the same CSS property.

Resolve declarations work just like progressive enhancement and graceful degradation! The last declaration defined in the ruleset will win. This means that declaration order matters. There are two ways to resolve any given property:

### Override Resolution
Override resolutions tell css-blocks that when these two styles  are used together, we want this Block to **override** the value of the other Style's property.

Here, we tell css-blocks to use the `color` value from `my-class` instead of `other.selector` when both styles are applied to the same element:

```css
.my-class {
  color: resolve("other.selector");
  color: red;
}
```

### Yield Resolution
Yield resolutions tell css-blocks that when these two styles  are used together, we want this Block to **yield** to the value of the other Style's property.

Here, we tell css-blocks to use the `color` value from `other.selector` instead of `my-selector` when both styles are applied to the same element:

```css
.my-class {
  color: red;
  color: resolve("other.selector");
}
```

> 🔮 **Future Feature: Resolve All Shorthand **
>
> For straightforward resolutions where you just want to yield or assume full control of styling against another block, feel free to use the CSS `all` property to quickly override or yield to all property conflict with another block. The downside of doing this is that as new properties are added to another element, you don't get a chance to review them and decide:

```css
.my-class {
  color: red;
  background: blue;

  /* Yields all conflicts to `other.selector` */
  all: resolve("other.selector");
}
```

> 💡 **Feature Note: Advanced Property Conflicts**
> 
> The css-blocks compiler is smart! If you have dynamic classes or states in your template, it will ask you to provide explicit resolutions between Blocks that even only have a *chance* of being used together on the same element. This way, we can guarantee that your styles will work regardless of the state your application may find itself it.
>
> Css Blocks is also aware of CSS shorthands and will ask you to resolve the lowest common denominator on conflicting shorthand/longhand expressions as well.

So, continuing with the example from the previous section –  **Composition in Templates** – we can satisfy the css-blocks compiler by adding in two explicit resolutions for `color` and `background-color` like so:

```css
/* stylesheet.css */
/* ... */

.button { 
  /* Override Resolution */
  background-color: resolve("hoverable.button");
  background-color: green;
  
  /* Override Resolution */
  color: resolve("hoverable.button");
  color: white;

  /* ... */
}
```

Here we have told css-blocks that when our component's `.button` class is used with hoverable's `.button` class, we want our component's style declarations to win! We have declared an **override resolution** for both properties.

If we were to switch around the order a bit so our `background-color` resolution comes *after* our component's declaration, it means that when these two classes are used together, hoverable's `.button` class will win, but only for that property. This is why you will never have to fight the cascade or use `!important` ever again!

```css
/* stylesheet.css */
/* ... */

.button { 
  /* Yield Resolution */
  background-color: green;
  background-color: resolve("hoverable.button");

  /* Override Resolution */
  color: resolve("hoverable.button");
  color: white;

  /* ... */
}
```

> 💡 **Feature Note: States and Pseudo-Classes**
>
> **States** and **Pseudo-Classes** inherit **all**  resolutions set on their containing **Class** or `:scope`.
>
> This means that in the above example, where we **yield** for `background-color`, and **override** for `color`, the button element where both classes are used will still use `hoverable.button:hover`'s `background-color`, but it's color will remain `white`, like our component styles define!

### Resolving Pseudo Elements
It is important to note that **Pseudo-Elements** do not inherit any resolutions from their container class and must be explicitly resolved in the source stylesheets when found to be in conflict.

So, for the following two Blocks where `my-class-1[state|enabled]` and `my-class-2` are used on the same element, one of the Blocks will need to resolve the conflicting `border-width` property:

```css
/* other */

.my-class-1[state|enabled]::before { 
  border: 1px solid red;
}
```

```css
/* main.css */

@block-reference other from "./other.css";

.my-class-2::before { 
  border-width: 2px;
  border-width: resolve("other.my-class-2[state|enabled]");
}
```

## External Selectors
Sometime a class, identifier, or tag name comes from an external source, and the only thing you can do is use them as is. In these situations the Block must declare all external simple selectors it intendeds to use. These simple selectors may then be used as key selectors inside this Block. You'll get an error for any declared external selectors that aren't used or if they are used in the context selector.

Styles targeting an external selector are not rewritten and their declarations cannot be optimized! Style collisions
on an external selector are not detected or resolved. As a result, it is allowed to use `!important` on declarations targeting an external selector.

Warning: If external selectors and CSS block objects both target the same HTML element in their key selectors you will get unpredictable results. It's best to avoid this.

```css
@external h2.some-rando-class;

.foo h2.some-rando-class {
  font-size: 32px !important;
}
```


## Global States

In rare occasions, a Block may choose to declare declare that a certain State is **global**. These states are special in that they can be used in other Blocks like they are local to that block.

This is most useful for global application states – like during initial application boot, or when a modal is displayed.

> ⚙️ **Performance Note: Global States**
> 
> When you apply classes and other attributes to elements like `<html>` or `<body>` it invalidates a lot of internal caches in the browser. It is still often a performance win compared to querying the document in javascript and applying classes on many elements.

```css
/* application.block.css */

@block-global [state|is-loading];
@block-global [state|is-saving];
```

```css
/* navigation.block.css */

@block-reference app from "application.block.css";

/* Gray out signout button when app is saving */
app[state|is-saving] .signout {
  color: gray;
  pointer-events: none;
}

/* Animate the logo when app is loading data */
app[state|is-loading] .logo {
  animation-name: bounce;
}
```

[CORE]: ./packages/@css-blocks/css-blocks
[RUNTIME]: ./packages/@css-blocks/runtime
[JSX]: ./packages/@css-blocks/jsx
[GLIMMER]: ./packages/@css-blocks/glimmer
[EMBER_CLI]: ./packages/@css-blocks/ember-cli
[WEBPACK]: ./packages/@css-blocks/webpack
[BROCCOLI]: ./packages/@css-blocks/broccoli
[WEBSITE]: ./packages/@css-blocks/website
[PLAYGROUND]: ./packages/@css-blocks/playground
