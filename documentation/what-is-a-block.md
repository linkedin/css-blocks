
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
:scope[enabled] { /* ... */ }

.sub-element { /* ... */ }
.sub-element[is-active] { /* ... */ }
```

## Sub-State Selectors

States on the `:scope` selector or a class selector may contain sub-states for more granular styling. Sub-states of a State are **mutually exclusive** and an element may only be in one sub-state of that state at any given time.

```css
:scope { /* ... */ }
:scope[theme="inverse"] { /* ... */ }

.sub-element { /* ... */ }

/* Applied for *any* value of `color`, including no value. */
.sub-element[color] { /* ... */ }

/* Applied for *specific* values of `color */
.sub-element[color="red"] { /* ... */ }
.sub-element[color="blue"] { /* ... */ }
.sub-element[color="yellow"] { /* ... */ }
```

## Blocks in Your Templates

Every specific template integration with CSS Blocks will have their own slightly unique syntax for how to interface with Block files. However, they all will allow you to apply classes and states in a way that is analyzable and rewritable at build time.

> 💡 **Feature Note: Template Integrations**
> 
> Each integration implements a slightly different API. Ex: JSX lets you `import` Block files, Ember looks for, through convention, a `stylesheet.css` alongside every component template. Check out the README for your template language for full details.

However, whatever the implementation is, it will feel as though you're interfacing with regular CSS on the platform. For example, in Glimmer you just write the classes and states exactly as you would expect when working with a normal stylesheet:

```css
:scope { /* ... */ }
:scope[enabled] { /* ... */ }
.button { /* ... */ }
.icon { /* ... */ }
.icon[inverse] { /* ... */ }
```

```hbs
{{!-- :scope selector is automagically applied to the template's root-level element. Thanks Glimmer! --}}
<section block:enabled={{isEnabled}}>
  <button block:class="button">
    <div block:class="icon" block:inverse={{isInverse}}></div>
    {{value}}
  </button>
</section>
```

There are only two (2) common-sense rules to follow when using Block styles in your template:

1. You **may not** use a Block class outside of it's `:scope`'s subtree.
2. Two classes *from the same Block* **may not** be applied to the same HTML element.

# 🏗 Block Composition

Blocks styles are, by design, scoped to the file they are written in, but we all know that in a real app your styles can't live in a vacuum!

As you'll see below, there are many methods to compose blocks together in your application. However, most of these methods will begin with the humble `@block`.

## Block References

A Block may declare a dependency on another Block by using a `@block` at the top of your file. A `@block` creates a locally scoped alias where you can access the public API (declared classes and states) of the referenced block.

Block references don't cause any styles to be included. Instead, they are like an ES6 `import` statement -- they make it possible to refer to the public interface of another Block from within the current Block.

Adding a `@block` is as simple as this:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[my-state] { /* ... */ }
```

```css
/* block-2.block.css */
@block other-block from "./block-1.block.css";

:scope { block-name: block-2; }
```

With the above code, `block-2` now has a local reference `other-block` which points to `block-1`. We can now freely use the `other-block` identifier inside of `block-2` when we want to reference reference `block-1`. This comes in handy! Especially with features like:

### Node Modules Block Resolution

Whether you're integrating with a 3rd party library, or pulling in dependencies internal to your company, at some point you'll want to integrate with styles delivered via npm! CSS Blocks supports this!

# Object Oriented Features of Blocks

## Block Implementation

A Block's public interface is defined by the states and classes it styles. A block may declare that it implements one or more other referenced blocks' interfaces, and the compiler will ensure that all the states and classes it defines are also in the implementing block. In this way, the compiler can guarantee it is safe to use different blocks to style the same markup in a component.

You do this via the special `implements` property in a Block's `:scope` selector:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[my-state] { /* ... */ }
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
> The `implements` property is only available in the `:scope` selector. If you use it in any other selector, it will be ignored.

However, the above code will throw an error at build time!

```bash
$ Error: Missing implementations for .my-class, .my-class[my-state] from ./block-1.block.css
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
.my-class[my-state] { /* ... */ }
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
.button[disabled] {
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

# Style Composition

## Block Paths

As your Blocks begin interacting with each other in increasingly complex ways, you will find yourself needing to reference specific classes or states on another Block, as you'll see later in this document. You do this using a small query syntax called a [Block Path](./packages/css-blocks/src/BlockSyntax/BlockPath.ts).

Block Paths take the form:

```
block.class[name='value']
```

All sections of this selector – except the leading Block name – are optional. The leading Block name *must* refer to an imported `@block` at the top of the file. If CSS Blocks is unable to resolve a Block Path at build time, you will get a friendly error message in your console!

All the following syntaxes are legal to select any given stylable on a referenced Block:

| Stylable        | Syntax                               |
|:--------------- |:------------------------------------ |
| Scope           | `block`                              |
| Scope State     | <code>block[name]</code>             |
| Scope Sub-State | <code>block[name=value]</code>       |
| Class           | `block.class`                        |
| Class State     | <code>block.class[name]</code>       |
| Class Sub-State | <code>block.class[name=value]</code> |

> 🔮 **Future Feature: Block Path Wildcards**
> 
> In some situations, you may want to select multiple classes, states or sub-states on a referenced block. In the near future you will be able to do so with a wildcard syntax: `block.*`, `block.class[*]`, `block.class[name=*]`. Feel free to track progress of this feature [here]()

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
@block other from "./hoverable.css";

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

But wait! If you try and run the CSS Blocks build with this code, you'd find an error in your console!

```bash
The following property conflicts must be resolved for these co-located Styles: (template.hbs:4:19)

          color:
            main.button (stylesheet.css:12:2)
            hoverable.button (hoverable.css:12:2)

          background-color:
            main.button (stylesheet.css:11:2)
            hoverable.button (hoverable.css:11:2)
```

Woah, what does this mean?! Well, if we stop and think for a second about what we just asked CSS Blocks to do, we'll realize that this error makes perfect sense.

Because Blocks have their own entirely independently scoped cascades, and right now no Block file is aware of any other Block's styles, CSS Blocks doesn't inherently know which Block should take priority over another when used together.

So, when CSS Blocks was asked to put the `.button` class from both the default template stylesheet, and from `hoverable` onto the same element, it noticed that both classes are claiming to set the `color` and `background-color` properties – and with this we have encountered our first **Indeterminate Cascade Resolution**.

Which Block should win in this situation? Right now, the compiler has no idea. To answer that, CSS Blocks needs a little help from you. We are able to provide explicit cross-Block cascade resolutions to the compiler by using `resolve()`. Lets learn how we can fix our above error by moving on to the next section: **Block Resolutions**.

## Block Resolutions

The special `resolve()` function provides explicit resolution guidance for properties that are in conflict across two or more Block files. They look like any other property declaration:

```css
selector {
  property-name: resolve("<block-path>");
}
```

You will be asked by the CSS Blocks compiler to add resolutions if and when two styles are found on the same element in your templates that attempt to set the same CSS property.

Resolve declarations work just like progressive enhancement and graceful degradation! The last declaration defined in the ruleset will win. This means that declaration order matters. There are two ways to resolve any given property:

### Override Resolution

Override resolutions tell CSS Blocks that when these two styles  are used together, we want this Block to **override** the value of the other Style's property.

Here, we tell CSS Blocks to use the `color` value from `my-class` instead of `other.selector` when both styles are applied to the same element:

```css
.my-class {
  color: resolve("other.selector");
  color: red;
}
```

### Yield Resolution

Yield resolutions tell CSS Blocks that when these two styles  are used together, we want this Block to **yield** to the value of the other Style's property.

Here, we tell CSS Blocks to use the `color` value from `other.selector` instead of `my-selector` when both styles are applied to the same element:

```css
.my-class {
  color: red;
  color: resolve("other.selector");
}
```

> 💡 **Feature Note: Advanced Property Conflicts**
> 
> The CSS Blocks compiler is smart! If you have dynamic classes or states in your template, it will ask you to provide explicit resolutions between Blocks that even only have a *chance* of being used together on the same element. This way, we can guarantee that your styles will work regardless of the state your application may find itself it.
> 
> Css Blocks is also aware of CSS shorthands and will ask you to resolve the lowest common denominator on conflicting shorthand/longhand expressions as well.

So, continuing with the example from the previous section –  **Composition in Templates** – we can satisfy the CSS Blocks compiler by adding in two explicit resolutions for `color` and `background-color` like so:

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

Here we have told CSS Blocks that when our component's `.button` class is used with hoverable's `.button` class, we want our component's style declarations to win! We have declared an **override resolution** for both properties.

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

So, for the following two Blocks where `my-class-1[enabled]` and `my-class-2` are used on the same element, one of the Blocks will need to resolve the conflicting `border-width` property:

```css
/* other */

.my-class-1[enabled]::before {
  border: 1px solid red;
}
```

```css
/* main.css */

@block other from "./other.css";

.my-class-2::before {
  border-width: 2px;
  border-width: resolve("other.my-class-2[enabled]");
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

@block-global [is-loading];
@block-global [is-saving];
```

```css
/* navigation.block.css */

@block app from "application.block.css";

/* Gray out signout button when app is saving */
:scope[app|is-saving] .signout {
  color: gray;
  pointer-events: none;
}

/* Animate the logo when app is loading data */
:scope[app|is-loading] .logo {
  animation-name: bounce;
}
```

> **⁉️ What the pipe is going on here?**
> 
> Once upon a time, developers fell in love with XML and thus was born xhtml, a flavor of HTML that allowed HTML elements to be mixed together with elements from other XML syntaxes like SVG and MathML. CSS went along for the ride and so, while many have never seen or used the feature, CSS has support for namespaced elements and attributes. In CSS, the `|` symbol is used to delimit between a namespace identifier (assigned by the `@namespace` at-rule) and the element or attribute name (also called a [qualified name](https://drafts.csswg.org/css-namespaces-3/#css-qualified-name)).
> 
> In markup, instead of a pipe symbol, the colon is used to delimit a namespace identifier and a qualified name. Yes, this can be confusing, but we don't make CSS syntax; we just use it.
