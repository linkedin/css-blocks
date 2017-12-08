CSS Blocks
==========

CSS Blocks are a way of writing highly decoupled and isolated styles that
can be statically analyzed and optimized for delivery and runtime
performance.

In a component-oriented web application there's one pillar of web technology
that doesn't quite seem to fit: Cascading Style Sheets. The goals of
components are to create strong boundaries and isolated behaviors that can
be composed without tight coupling. CSS is global and the desire to create
visual consistency across an application seems at odds with the goal of
isolation. What's more, techniques that produce styles that are kept in
isolation have been at odds with browser performance: highly specific and
scoped selectors have performance issues, class name mangling is bad for
gzip compression, inline styles are slow, and mixins, while useful for
sharing styles consistently into components, produce bloated output.

The smallest, most performance-friendly stylesheets tend to be oriented
around highly presentational aspects that shun even basic abstractions.

CSS blocks is a set of tools that work together to provide component-oriented
styling that compiles to high-performance presentational selectors:

1. Component authoring system.
2. Template analyzer.
3. CSS optimizer.
4. Template rewriter.
5. A runtime for dynamic style manipulation.

All of these tools exist to make the CSS optimizer as powerful as possible
and to keep the style interfaces that we use, consistent despite the
significant changes that the optimizer makes.

When it all comes together, the bloat and performance issues that are
inherent to isolation are optimized away. You can write `width: 100%`
hundreds of times but the optimized CSS will only have a few such
declarations where they are absolutely needed.

Inspired by CSS Modules, BEM and Atomic CSS
-------------------------------------------

This approach to styling is an evolution of many existing best practices. It
aims to provide the isolation and component-oriented approach possible with
CSS Modules and BEM with less repetition required by authors and being more
compression friendly while providing tooling to aggressively optimize those
styles by sharing declarations as one might with Atomic CSS and similar
declaration-oriented styling solutions.

Ergonomic Performance
---------------------

Although there are constraints on the types of selectors you can write with CSS blocks,
adopting CSS blocks is unlikely to feel like a major departure from your current
approach. Users report that their styles are cleaner, more organized, and less
coupled. It's possible to reduce your CSS size by up to 80% (about 65% after gzip).
If you have a route-based bundling system, it is possible to build CSS bundles that
are optimized for that most important first page view.

Use with your favorite tools
----------------------------

CSS Blocks is built on standard CSS syntax so it can be used in conjunction
with CSS best-in-class processing tools like Sass, PostCSS, CSS Nano,
Autoprefixer, etc.

When using CSS blocks with syntactic sugars like Sass, Less, or Stylus, you
must first compile all of the blocks with that processor and provide the
outputs of that file to this one. (Alternatively, the Importer API
documented below can be leveraged to do just-in-time compilation.)

Note that when post processing your CSS files with other compressors and
fixups, it is recommended that you do so only after using the CSS blocks
optimizer. If any tools change the selectors that have been output from the
compressor, you are likely to encounter problems especially with dynamic
interactions.

What's a Block?
---------------

The "block" in CSS Blocks is a unit of styling that is kept isolated
from all other blocks. The styles in one block are related to each other
in a functional way such that they wouldn't make sense by themselves.

The styles in a block are kept in their own CSS file to avoid confusion.

Most commonly, there's a single block for a particular component. However,
it also completely natural and expected for several blocks to be composed
together in an HTML template.

The name "Block" finds it's origin in the BEM approach to CSS architecture.
They share some key concepts. In fact, it is possible to compile a CSS Block
into BEM syntax and so for many of the code examples used here that is the
output mode used because it is familiar and more human readable than other
output modes.

How a CSS block becomes available to markup in a template is specific to the
individual template syntax and framework conventions. See Template
Integrations below for more details on specifically supported frameworks.

For our first example we will wave our hands and say that *somehow* these
plain HTML markup examples are specific to the corresponding block files.

### An example of a simple form

Consider the following markup:

```html
<form state:theme=dark state:compact>
  <div class="input-area">
    <label for="username" class="label">Username:</label>
    <input id="username" class="input" type="text">
  </div>
  <div class="input-area">
    <label for="password" class="label">Password:</label>
    <input id="password" class="input" type="password">
  </div>
  <button type="submit" class="submit" state:disabled disabled>
</form>
```

In conjunction with the following block stylesheet that styles classes and attributes
in the `state` namespace:

```css
/* my-form.block.css */
.root                   { block-name: my-form; margin: 2em 0; padding: 1em 0.5em; }
[state|theme=light]     { color: #333; }
[state|theme=dark]      { color: #ccc; }
[state|compact]         { margin: 0.5em 0; padding: 0.5em; }
.input-area             { display: flex; margin: 1em 0; font-size: 1.5rem; }
[state|compact]
  .input-area           { margin: 0.25em 0; }
.label                  { flex-basis: 1; }
.input                  { flex-basis: 3; }
[state|theme=light]
  .input                { border-color: #333; }
[state|theme=dark]
  .input                { border-color: #ccc; }
.submit                 { width: 200px; }
.submit[state|disabled] { color: gray; }
```

In BEM compatibility mode these would compile to:

```html
<form class="my-form my-form--theme-dark my-form--compact">
  <div class="my-form__input-area">
    <label for="username" class="my-form__label">Username:</label>
    <input id="username" class="my-form__input" type="text">
  </div>
  <div class="my-form__input-area">
    <label for="password" class="my-form__label">Password:</label>
    <input id="password" class="my-form__input" type="password">
  </div>
  <button type="submit" class="my-form__submit my-form__submit--disabled">
</form>
```

and

```css
.my-form { margin: 2em 0; padding: 1em 0.5em; }
.my-form--theme-light { color: #333; }
.my-form--theme-dark { color: #ccc; }
.my-form--compact { margin: 0.5em 0; padding: 0.5em; }
.my-form__input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
.my-form--compact .my-form__input-area { margin: 0.25em 0; }
.my-form__label { flex-basis: 1; }
.my-form__input { flex-basis: 3; }
.my-form--theme-light .my-form__input { border-color: #333; }
.my-form--theme-dark .my-form__input { border-color: #ccc; }
.my-form__submit { width: 200px; }
.my-form__submit--disabled { color: gray; }
```

After optimization it may look more like:

```css
.c4 { margin: 2em 0 }
.c5 { margin: 0.5em 0 }
.c6 { margin: 1em 0 }
.c7 { padding: 1em 0.5em }
.c8 { padding: 0.5em }
.c9 { color: #333 }
.ca { color: #ccc }
.cb { color: gray }
.cc { display: flex }
.cd { font-size: 1.5rem }
.ce { flex-basis: 1 }
.cf { flex-basis: 3 }
.cg { width: 200px }
.c3 .ch { margin: 0.25em 0 }
.c1 .ci { border-color: #333 }
.c2 .cj { border-color: #ccc }
```

and the template would become:

```html
<form class="c4 c7 c3 c2">
  <div class="cc c6 cd ch">
    <label for="username" class="ce">Username:</label>
    <input id="username" class="cf" type="text">
  </div>
  <div class="cc c6 cd ch">
    <label for="password" class="ce">Password:</label>
    <input id="password" class="cf" type="password">
  </div>
  <button type="submit" class="cg cb">
</form>
```

There's not a lot of benefit to optimizing a single block -- remember the goal
is to remove duplication across components. At scale, CSS Blocks works wonders.

Now that we've seen what it looks like, let's dig in.

What's a State?
---------------

You probably noticed the attributes prefixed with `state:` in the example
above. States are a core concept in CSS Blocks and form the basis for
constraints on the selectors that we write. These constraints are important
for keeping runtime state of the browser to a minimum and at well defined
places which allows the optimizer to work better. States also force us
to write selectors with a minimal amount of coupling between elements.
At first it may feel restrictive, especially if you're used to using context
as a way of describing differences in the way a shared component looks.

You'll remember that a block is a way of isolating the styles contained
within it. That means we can't use context as a proxy for understanding
design differences because it's not possible (for example) for the sidebar
to create a selector that changes how a button that is styled by another
block will look by targeting the classes and states of that other block.

States come in two flavors. Most states are a boolean state that is either
on or off. This is represented in markup as a state attribute without a
value. Some states are mutually exclusive from one another. For instance, if
a block provides a light and dark theme you can't apply both at the same
time. In this case, the state can be assigned substates that are exclusive
from each other. Such states are represented in markup by a state attribute
that is assigned a value. For instance `<div state:theme="light">`.

A state is attached to a single class in the block and describes how that
class changes when the element is in that state. The names of states are
scoped to their class and the styles they provide can target only elements
assigned to that classname. The exception to this is for states that belong
to the block `.root` class. In general, CSS Blocks restricts the use of
combinators in selectors with a preference for unscoped selectors that are
fast and optimization friendly (See Rules & Constraints below). One of the
primary exceptions to this is that root states can be used in selectors as a
scope for classes and other states within the block. So when you find
yourself thinking that you absolutely need to use a descendant or child
combinator then you should imagine that use case as a state for a block's
 `.root` class.

It is important to think of States as part of the public API that describe
how a block and the classes within it can vary. By keeping all the
differences local, it's easier to maintain a block and to understand how
changes to the block will affect an entire application. When we remove
outside context from selectors it becomes possible to re-use those styles
safely. It also forces developers to think of naming their design
differences explicitly which has long term benefits for maintaining the
styles -- you can certainly create a state `state:in-sidebar` for a block,
but it's much better to imagine *why* the sidebar is different and to name
it accordingly. In this way, other developers will understand the intent
better.

Occasionally, some states are best managed for an entire application and
many blocks will need to react to those state changes. Traditionally, this
done by applying a class to the `html` or `body` elements. To deal with this
CSS Blocks allow some states to be declared global and used as if it
belonged to the block. As with all things global, this increases the testing
costs and adds coupling, however, it is actually quite friendly to the
optimizer. See "Global (application) States" below for more information.

It is worth noting that with CSS Blocks it is possible for one block to
apply it's own classes that override styles from other classes and states
for a given element by applying them together at the template level. CSS
Blocks also provides a powerful resolution system to handle this use case.
But this exists to support the situation where the classes are targeting
very different styling concerns. It is strongly discouraged to use classes
as overrides across blocks.

A much better solution when you can't make the change to pre-existing block
for some reason is to use Block Inheritance to add new classes and states to
an existing block. Inheritance is another way that a block can present
different styling options. For more information, see "Block Inheritance"
below.

Terminology
-----------

### CSS Terminology

CSS Blocks cares an awful lot about the kinds of selectors that you will be writing.
So before we begin talking about selectors let's make sure we understand some of the
more arcane terminology that is most often found only in W3C specifications. Don't let
this scare you, the system is actually very simple to use, it's just the rules are
hard to describe clearly without these terms.

![CSS Terms Example](https://rawgit.com/chriseppstein/af2939a908582ba7c61c2bdf88d5a46e/raw/1c2dbdb19288f26f2f2369aef82caa2c551ab71b/css-terms.svg)

1. `selector` - A general term for an expression that selects elements from an HTML document.
   There are several subtypes:

    1. `simple selector` - selects one aspect of an html element. E.g. element name,
       class, attribute, identifier, `*`, pseudo-class, pseudo-element,
    2. `compound selector` - a sequence of `simple selectors` applied to the same element.
    3. `combinator` - a symbol that describes the document relationship
       between two selectors. The most common `combinator` is the space which
       implies a descendant relationship.
    4. `key selector` - The `simple` or `compound` selector that applies to
       the element that receives the `declarations` in the `ruleset`.
    5. `context selector` - Describes the other elements on the page that must be present
       in order for the `key selector` to match.
2. `ruleset` - A selector and a set of styles applied to the elements selected.
3. `property` - A style attribute.
4. `value` - What a `property` is set to.
5. `declaration` - A `property`/`value` pair.

### CSS Block Terminology

1. Block - A block is a set of interdependent styles that exist in isolation
   from styles in other Blocks. A block has a name.
2. Root - The root element of the block. All other HTML elements assigned styles
   from a Block must be contained in the HTML subtree of elements of the
   block's root.
3. Class - Any class in a block file is local to that block and isolated
   from all other similarly named classes in other blocks.
4. State - A state is attached to a particular class. States attached to the
   block's root class have special privileges.
5. Substate - A state can have substates and can only be in one such substate
   at any given time.
8. Block Inheritance - A block can inherit styles from another block. This
   creates an equivalence between the roots and all the names for the two
   block's states and classes. For more on inheritance see the Block
   Inheritance section below.
9. Block Interface - A block's public interface is defined by the states and
   classes it styles. A block can declare that it implements one or more
   other block's interfaces and the compiler will ensure that all of those
   states and classes are styled locally. In this way, it is safe to use
   different blocks to style the same markup component.

Rules & Constraints
-------------------

1. Each selector's key selector must target a single block object (the
   block root, a block class, or a state).
2. The same block object targeted by the key selector can be used in the
   context selector.
3. pseudo-classes can be used in conjunction with any block object in the
   context and key selectors.
4. Pseudo-elements can be used in conjunction with the key selector.
5. Media queries and other @-rules are allowed.
6. The context selector cannot contain classes or external selectors. The
   exception to this is that the block object in the key selector can be part
   of it's own context selector.
7. The context selector cannot contain states, except for at most one state
   if it belongs to the root class of the same block or is a global state of
   another block's root. See "Global (application) States" below.
8. You may not use a block class outside of the root element's HTML subtree.
9. `!important` is forbidden.
10. Element, Attribute, ID selectors are discouraged. See "External Selectors" below.
11. All classes are local by default. See "External Selectors" below.
12. Two classes from the same block may not be applied to the same HTML element.

Syntax
------

### The root element

Styles can be attached to a block's root element with the class `.root`. The
`.root` class can be used in selectors in combination with itself as well as
in media queries and other @-rules. However, some block-specific syntax may
only be put into a simple ruleset where the selector is exactly `.root`; it
is convention to have only one such ruleset near the top of your block's
file.

Root specific declarations:

* `block-name`: Optional. This is the preferred name of the block. The value
  must be a legal css identifier. When omitted, the path of the file is used
  to derive a name. This property is required when the natural name based on
  the file's path is not a legal CSS identifier. Note: the way a path becomes
  a name is configurable on a per-application or framework integration basis.
* `implements`: a space separated list of block names that have already been
  declared with `@block-reference` (See below).
* `extends`: the value is name of a single block from which to inherit the
  styles and public interface. Note that this does not change the output of
  the block but instead it affects the classes that are used in the templates
  after rewriting.

### Classes

Classes in a block are syntactically identical to classes in a standard CSS
file but are subject to the rules and constraints mentioned above.

### States

A State is represented as an attribute on an html element with the `state:` prefix.
States can have substates by assigning a value to the attribute. This prefix
is important for template analysis to ensure that states are used correctly and
properly rewritten to standard CSS classes.

Examples of specifying states in html:

```html
<div class="button" state:visible state:theme="bright">
```

Then those states can be style in a block with corresponding attribute selectors:

```css
.button[state|visible] {
  display: inline;
}
.button[state|theme="bright"] {
  color: white;
  background-color: red;
}
```

The attribute selector for a substate must use the `=` operator. This ensures
that substates are mutually exclusive and also that a correspondence between
attributes and optimized classnames can be created.

Note that we use a `|` instead of a colon in the stylesheet. This is
standard CSS syntax for an attribute namespace and all compliant CSS parsers
allow it.

It is not allowed to have a state with substates but to reference it without
including a substate. E.g. you cannot have `<div class="button" state:size="large">`
and then reference it with `.button[state|size]`, Instead, you must provide
a ruleset that matches all substates.
E.g. `.button[state|size=large], .button[state|size=small]`.

### Block References

You can declare a dependency on another block with the `@block-reference`
@-rule. Block references don't cause any styles to be included. Instead,
they are like an ES6 `import` statement -- they make it possible to refer to
the public interface of another block from within the current block and to
resolve any namespace collisions with locally preferred identifiers.

A `@block-reference` creates a locally scoped alias for the styles in the referenced block:

```css
@block-reference icons from "../../shared/styles/icons/dark.block.css";
```

### Conflicting Block Names

If two blocks are defined with conflicting names, CSS Blocks will
automatically generate a unique name for BEM output mode.

`shared.block.css`

```css
.root {
  block-name: my-block;
  color: blue;
}
.item {
  color: red;
}
```

`my-component/styles.block.css`

```css
@block-reference shared from "../shared.block.css";

.root {
  block-name: my-block;
  background-color: blue;
}
.item {
  background-color: red;
}
```

`my-component/template.hbs`
```hbs
<div class="shared">
  <div class="item">Styles Item</div>
  <div class="shared.item">Shared Item</div>
</div>
```

In BEM output mode this would compile to:

```hbs
<div class="my-block my-block-2">
  <div class="my-block__item"></div>
  <div class="my-block-2__item"></div>
</div>
```

Global (application) States
---------------------------

A block can declare that a state is global. These states are special
in that they can be used in combinators in other blocks like any state
from that block.

This is most useful for global application states like during initial
application boot or when a modal is displayed.

Performance note: when you apply classes and other attributes to
elements like `<html>` or `<body>` it invalidates a lot of internal
caches in the browser. It is still often a performance win compared to
querying the document in javascript and applying classes on many
elements.

`application.block.css`

```css
@block-global [state|is-loading];
@block-global [state|is-saving];
```

`navigation.block.css`
```css
@block-reference app from "application.block.css";

app[state|is-saving] .signout,
.signout[state|disabled] {
  color: gray;
  pointer-events: none;
}
```

### Block Object Expressions

There are situations in blocks and templates that use them where it is necessary to refer
to a specific block object. In these cases, a block object expression is used. A block
object expression looks similar to a compound selector but it should not be confused
with a specific selector in the block. In fact, it is an abstraction that can cause
the CSS blocks compiler to consider many selectors in a block that involve the specific
block object.

  - `.root` represents the block root for the current block.
  - `a-block-reference.root` represents the block root for the
    block that has a `@block-reference` as `a-block-reference` from the current
    block. In many cases, the `.root` can be safely omitted.
  - `[state|foo]` or `[state|foo=bar]` represent the
    root state named `foo` or the state named `foo` with the substate of `bar`.
  - `a-block-reference[state|foo]` or `a-block-reference[state|foo=bar]`
    represent the state named `foo` or the state named `foo`
    with the value of `bar` from the block that is referenced from the current
    block as `a-block-reference`. In templates, where a block object
    expression is given in the context of a state attribute, this simplifies
    to `<div state:a-block-reference.foo>` or `<div state:a-block-reference.foo=bar>`.
  - `.foo` represents the class named `foo`;
  - `a-block-reference.foo` represents the class named `foo`
    from the block that is referenced from the current block as
    `a-block-reference`.
  - `.my-class[state|foo]` or `.my-class[state|foo=bar]` represents the
    state named `foo` attached to the class `.my-class`.
  - `a-block-reference.my-class[state|foo]` or
    `a-block-reference.my-class[state|foo=bar]` represents the
    state named `foo` attached to the class `.my-class` from the block
    that is referenced from the current block as `a-block-reference`.
    In templates, where a block object expression is given in the context of
    `class` and `state` attributes, this simplifies to
    `<div class="a-block-reference.my-class" state:a-block-reference.foo>`.

### External Selectors

Sometime a class, identifier, or tag name comes from an external library or
content comes from a database and the only thing you can do is use them as
is. For these situations The block must declare the simple selectors that
are external to the block. These simple selectors can then be used as key
selectors that are scoped by a block's root, class or state as long as the
context selector would be valid as it's own selector as specified in the
Rules & Constraints section.

You'll get an error for any declared external selectors that aren't used or
if they are used in the context selector. Styles targeting an external selector
are not rewritten and their declarations cannot be optimized. Style collisions
on an external selector are not detected or resolved. As a result, it is allowed
to use `!important` on declarations targeting an external selector.

Warning: If external selectors and CSS block objects both target the same
HTML element in their key selectors you will get unpredictable results. It's
best to avoid this.

```css
@external h2 .some-rando-class;

.foo h2.some-rando-class {
  font-size: 32px;
}
```

### Block Composition

In some cases a block class is logically the root of another block.
Rather than having to specify the block root, a block class can declare itself to be the root of another block in a specific state or set of states.

```css
// tab.block.css
.root {
  background-color: gray;
  color: black;
  flex: 1 1 content;
}
[state|selected] {
  background-color: blue;
  color: white;
}
[state|permanent] {
  font-weight: bold;
}

.button {
  background-image: url(close-button.svg);
  cursor: hand;
}

[state|permanent] .button {
  background-image: url(pin.svg);
  cursor: pointer;
  pointer-events: none;
}
```

```

// tabs.block.css
@block-reference tab from "tab.block.css";
.root {
  display: flex;
}

.main-tab {
  text-decoration: underline;
}
```

Without the `@is-block` directive the markup would look like this:

```html
<div class="tabs">
  <span class="tab main-tab" state:tab.permanent>
    <a href="/main.html">
      Home
      <img class="tab.button"></img>
  </span>
</div>
```

But in this example, the very concept of the "main tab" implies that it is a
tab and also that it's permanent so this feels redundant. So we augement
the `.main-tab` class:

```css
.main-tab {
  @is-block tab[state|permanent];
}
```

And now, with the `@is-block` directive we can just write this instead:

```html
<div class="tabs">
  <span class="main-tab">
    <a href="/main.html">
      Home
      <img class="tab.close">x</img>
  </span>
</div>
```

All the same output classes are implied in both of these cases for the resulting re-written markup.

Because the `main-tab` class implies the `tab` root class, it is now
also legal to apply the `state:tab.selected` state to that element.



### Block Inheritance

To inherit from another block you must first define a reference to the
other block:

```css
@block-reference another from "./another-block.block.css";
```

And now that block can be referenced within this file by the name
`another`.

To inherit, you must set the property `extends` inside the block's `.root`
class to the name of the block you wish to inherit.

```css
@block-refererence another from "./another-block.block.css";

.root {
  extends: another;
}
```

Note that block inheritance does not change the CSS output for a block.
instead, it changes exported identifiers associated with the block's
different objects. That is, the class(es) that are generated from
`another-block`'s `.foo` element are now associated with this blocks
`.foo` element and all of the classes will be returned to the template.
Additionally, even if an object from the base class isn't mentioned in
the subclass, you can still set the classnames associated with it as if
it had them.

Inheritance is generally preferred over root states when a design difference affects
many classes within the block because it optimizes better -- but it is not
friendly for composing with other sub-blocks on the same element.

### Block Interfaces

In some cases it may be necessary for a block to conform to the public API
of one or more blocks but that you want to provide a distinct
implementation of that interface. To accomplish this, you can declare
a block `implements` one or more blocks.

```css
@block-reference base from "./base.block.css";
@block-reference other from "./other.block.css";
.root { implements: base, other; color: red; }
```

Now if there are any states, classes or substates in those other blocks
that aren't mentioned in this block you will get an error:

```
Missing implementations for: [state|large], .foo[state|small] from
./base.block.css
```

Note that this doesn't require a selector-level correspondence, merely
that the different types of states and classes have *some* styling.

### Resolving Style Conflicts

One of the key features of CSS blocks is its unique resolution system that
together with knowledge of what classes are used together on the same
elements in all templates using CSS blocks provides hints to the optimizer
so that it can provable rewrite declarations across what would normally be
unsafe to do with a normal cascade aware optimizer which must assume that
key selectors *may* target the same html element.

Style conflicts are handled on a per-property basis and allow for a high
granularity of control over how collisions are resolved.

Probably the most important concept that you need to understand about conflict
resolutions is that you are declaring which block object owns a particular property
when it conflicts with a specific selector in the current scope. Then, the block compiler
generates selectors that use specificity to create the desired resolution value
for all selectors that conflict with that property for that block object.

Conflict resolution is aware of short-hand/long-hand property collisions and
will resolve the desired property correctly.

During template analysis, any selectors that conflict due to actual usage
will produce an error unless a resolution is provided.

This may sound very complicated, but some code examples will elucidate
just how natural it feels in use:

#### Yield Resolution

The first kind of resolution is called a "yield". That's where the styles
for a property in the current selector yield to the values for the selectors
that conflict in another block object's selectors.

```css
/* nav.block.css */
.nav { border: 1px solid black; }
```

```css
/* header.block.css */
@block-reference other from "./other.css";
.header {
  border: none;
  border: resolve("other.nav");
}
```

Just like a browser that would discard previous values for the same property
if it understands the later property's value, we can imagine that this is
like a value that only gets set and matters only when it matches an element
where `other.nav` is the key selector in the cascade.

To accomplish this, we compile the selector to something a browser will
 actually understand and respect:

```css
/* header.resolve-output.css */
.conflicts__header { border: none; }
.other__nav.conflicts__header { border: 1px solid black; }
```

As you can see, without optimization this produces selectors that use specificity
to resolve any possible conflicts irrespective of concatenation order.

What might not be as obvious is that for an optimizer that wants to combine
`border: 1px solid black` from `.other__nav` with another
`border: 1px solid block` declaration that it finds in the stylesheet, it wouldn't be
able to do so if the `.conflicts__header` selector was intervening between
them. It would have to assume that they might conflict. With template
analysis alone it may be able to safely combine those declarations with
intervening conflicts because it could know that two particular classes never
collide. But with this extra hint it can go even further -- it proves that
yes, there's a conflict, but thanks to specificity, it can now rewrite all
three selectors having the declaration of `border: 1px solid black` into a
single selector as long as it correctly rewrites the template to use that
class instead of the one associated with `border:none`.

#### Override Resolution

An override resolution is when the values in the current selector take precedence
over the values for that property in the resolution target.

Given our same example from before:

```css
/* nav.block.css */
.nav { border: 1px solid black; }
```

We now resolve the target block object before our local values, causing our
local values to take precedence.

```css
/* header.block.css */
@block-reference other from "./other.css";
.header {
  border: resolve("other.nav");
  border: none;
}
```

The compiler produces similar output to the yield resolution, but now the
resolved selector has the value from the local selector.

```css
/* header.resolve-output.css */
.conflicts__header { border: none; }
.other__nav.conflicts__header { border: none; }
```

Let's consider some more complex cases and see how the resolver handles those.

### Resolving Pseudo-elements

When resolving a selector for a pseudo-element, only conflicts for other
selectors of that same pseudo-element are resolved.

```css
/* links.block.css */
.external { font-style: normal; }
.external::before { content: "["; font-style: normal; }
.external::after { content: "]"; font-style: normal; }
```

```css
/* lists.block.css */
@block-reference links from "./links.block.css";
.list-item::before {
  content: "*";
  content: resolve("links.external");
  font-style: resolve("links.external");
  font-style: italic;
}
```

In this case, the only resolution would be:

```css
.links__external.lists__list-item::before {
  content: "[";
  font-style: italic;
}
```

### Resolving Pseudo-classes

All selectors conflicting with the resolved property are resolved against the
target block's root, class or state regardless of pseudo-classes.

What this means is that when you override a target with pseudo classes, you
effectively nullify the effect of those pseudo-classes on the resolved property.
Those pseudo-classes would have to be reproduced locally and set to and explicit
value (also with an override resolution) in order to preserve the conflicting pseudo-class behavior.

Example:

```css
/* links.block.css */
.external { color: blue; }
.external:nth-child(2n + 1) { color: yellow; }
.external:hover { color: green; }
```

```css
/* lists.block.css */
@block-reference links from "./links.block.css";
.list-item {
  color: purple;
  color: resolve("links.external");
}
.list-item:nth-child(4n + 1) {
  color: resolve("links.external");
  color: black;
}
```

In this case, the resolutions would be:

```css
.links__external.lists__list-item {
  color: blue;
}
.links__external.lists__list-item:nth-child(2n + 1) {
  color: yellow;
}
.links__external.lists__list-item:hover {
  color: green;
}
.links__external.lists__list-item:nth-child(4n + 1),
.links__external.lists__list-item:nth-child(2n + 1):nth-child(4n + 1),
.links__external.lists__list-item:hover:nth-child(4n + 1) {
  color: black;
}
```

### Resolving State Conflicts

Styles for target block's root state or class state may also conflict with
the current selector. State selectors have a higher specificity and so you
may expect that they would automatically resolve against a lower specificity
selector without needing an explicit resolution. But experience shows
specificity is not always the determining factor in what should win; if it
were, we'd never have used `!important` to work around it. Each state is
it's own concern and must be resolved in the case of a conflict.

```css
/* article.block.css */
.link { color: lightblue; }
.link[state|destination=on-page] { color: blue; }
.link[state|destination=external] { color: red; }
.link[state|disabled] { color: gray; }
[state|is-loading] > .link { color: darkgray; }
```

```css
/* icons.block.css */
.icon {
  color: resolve("article.link");
  color: resolve("article.link[state|destination=on-page]");
  color: white;
  color: resolve("article.link[state|destination=external]");
  color: resolve("article.link[state|disabled]");
  color: resolve("article[state|disabled] article.link");
}
```

Now, that's quite a lot of resolutions but a few things to note here, we're
conflicting with a primary responsibility of the target class and its states
in this case, so it stands to reason that we would have to do more work and
this may give us pause about whether it's appropriate to even have these
styles on the same element together.

Note that selector query expressions with `resolve()` must handle
global states by referencing the same global block locally and using it in
the selector query expression. It is not required for both blocks to use the
same local identifier for the block with the global state. Example:

```css
/* icons.block.css */
@block-reference article from "./article.block.css";
@block-reference app from "./app.block.css";
.icon {
  color: white;
  color: resolve("app[state|is-loading] article.link");
}
```

#### Resolution Queries with Wildcards

In some cases, it may be appropriate to have resolution policies for
conflicts that encompass multiple states. To handle this more elegantly it
is possible to query selectors involving states with wildcard expressions.

When using wildcard expressions, the same target selector may get resolved by
several query expressions. In the case where a selector is both yielded and
overridden, the more fully specified query will win.

In the following example we achieve the same resolution as above:

```css
/* icons.block.css */
.icon {
  color: resolve("article.link");
  color: resolve("article.link[state|destination=on-page]");
  color: white;
  color: resolve("article.link[state|*]");
  color: resolve("article[state|disabled] article.link");
}
```

Wildcard syntax:

* `.*` - any class.
* `[state|*]` - any state.
* `[state|foo=*]` - any substate of state `foo`.
* `[state?|*]` - any state or no state at all.
* `[state?|foo=*]` - any substate of the state `foo` or no substate at all.

Wildcard examples:

* `block.*` - All classes in the block `block`.
* `block.class[state|*]` - All states for the class `class` (but not the class itself).
* `block.class[state|foo=*]` - All substates for the specific state `foo`.
* `block.class[state?|foo]` - The class as well the state `foo` if it exists.
* `block.class[state?|*]` - The class as well as all states of the class.
* `block[state|*] block.class` - The class but only when modified by any root-level state with any legal combinator(s).
* `block[state?|*] block.class` - The class as well as when it is modified by any root-level state with any legal combinator(s).
* `block[state?|*] block.class` - The class as well as when it is modified by any root-level state with any legal combinator(s).

In addition to wildcards, the `resolve-all()` function will resolve all
states relating to a block object as well as the object itself. If given a
state, the class for that state is not resolved, but all root-level state
scopes of that state are resolved.

Example:

```css
/* icons.block.css */
@block-reference article from "./article.block.css";
.icon {
  color: white;
  color: resolve-all("article.link");
}
```

You can think of resolve all as being a simpler way of writing
complex state queries:

`resolve-all()` | `resolve()` Equivalent
----------------|-----------------------
`resolve-all("block.class")` | `resolve("[state?|*] block.class[state?|*]")`
`resolve-all("block.class[state|foo]")` | `resolve("[state?|*] block.class[state|foo]")`
`resolve-all("block.*[state|foo]")` | `resolve("block[state?|*] .*[state|foo]")`
`resolve-all("block.*")` | `resolve("block[state?|*] block.*[state?|*]")`

Note that `resolve-all("block.*")` essentially resolves all conflicts
for that property against every selector in the other block that might conflict.
This is the `!important` of css-blocks.

Note that `resolve-all()` has the additional behavior of resolving against global
states from other blocks.

It is possible to combine resolutions with `resolve()` in combination with
`resolve-all()` in order to specify a different resolution for a specific
set of selectors. This is especially useful if a resolution encounters a
resolution constraint that forces a yield instead of an override. So
now is probably a good time to learn what resolution constraints are...

### Resolution Constraints

Some properties are critical to proper functioning of the block. For
instance, if a block is using CSS grid to do layout, you'd expect the design
to break if the block element's display property was resolved to a different
value. Or perhaps there's a minimum width below which the design breaks.

In these situations, a block's selectors can provide constraints for a
property that limit the legal overrides to ensure compatibility.

 ```css
 .icons {
   display: grid;
   display: constrain(--self);
 }
 ```

The `--self` identifier says that the property may only be resolved with one
or more values that are set locally for that same property.

You can also list legal values that it can be resolved to, separated by a comma.

 ```css
 .icons {
   border: 1px solid black;
   border-style: constrain(--self, dashed, dotted);
 }
 ```

 As you can see from above, you can provide constraints on a long hand
 property to set a constraint on just one of the values in a short hand
 property that is specified. This would allow the border to be resolved
 arbitrarily for the `border-width` and `border-color` as long as the
 `border-style` is matches the constraint.

 ```css

.column {
   width: 300px;
   width: constrain(range(200px, 400px));
 }
 ```

 TBD: syntax for range constraints and other possible constraint types.

#### Progressive Enhancement

When we use progressive enhancement we set the conflicting properties
 several times and let the browser pick up the one it understands.

```css
/* nav.block.css */
.nav {
  font-size: 18px;
  font-size: 1.2rem;
}
```

We now resolve the target block object before our local values, causing our
local values to take precedence.

```css
/* header.block.css */
@block-reference other from "./other.css";
.header {
  font-size: 16px;
  font-size: 1rem;
  font-size: resolve("other.nav");
}
```

In this case, the compiler copies all the values for the conflicting
 property into the resolution selector:

```css
/* header.resolve-output.css */
.conflicts__header { font-size: 16px; font-size: 1rem; }
.other__nav.conflicts__header { font-size: 18px; font-size: 1.2rem; }
```

#### Overriding Wildcard Resolutions

Earlier we said "In the case where a selector is both yielded and
overridden, the more fully specified query will win." and this was a bit
hand-wavey. What does it mean for a query to be "more specified"?

1. A query that has no wildcards is more fully-specified than a query with a
   wildcard.
2. A substate wildcard (`[state|foo=*]`) is more specified than a general
   state wildcard (`[state|*]`).
3. A state wildcard is more specified than an optional state wildcard of the
   same type. E.g. `[state?|*]` loses to `[state|*]`, `[state?|foo=*]` loses
   to `[state|foo=*]`.
4. A class wildcard for a specific state is less well specified than a state
   wildcard for a specific class. E.g. `.*[state|foo]` loses to `.foo[state|*]`
   and to `.foo[state?|*]`
5. A state wildcard on a specific class is more specified than a state
   wildcard as context.
6. A substate wildcard as context is more well specified than a
   class wildcard with or without a state.

TBD: We need to decide on a way to ascribe a numeric value or values for a query
that will allow queries to be compared. We should document that specific
calculation here.

#### Multiple Conflicting Target Selectors and Context Selector Handling

Consider the following conflicts when `target.main` and `conflicts.article` are applied to the same element:

```css
/* target.block.css */
.main    { color: blue; }
[state|hidden] .main { color: transparent; }
```

```css
/* conflicts.block.css */
@block-reference target from "./target.css";
[state|happy] .article {
  color: green;
  color: resolve("target.main");
}
```

We now produce the following output:

```css
.conflicts--happy .conflicts__article { color: green; }
.conflicts--happy .target__main.conflicts__article { color: blue; }
.conflicts--happy.target--hidden .target__main.conflicts__article { color: transparent; }
.target--hidden .conflicts--happy .target__main.conflicts__article { color: transparent; }
.conflicts--happy .target--hidden .target__main.conflicts__article { color: transparent; }
```

Resolving is relatively straight forward as long as only one selector has a
context selector. When two selectors with context are resolved there is a
combinatorial explosion like we're accustomed to seeing the Sass's
`@extend`. But it's important to remember that these selectors are
transitional and will be optimized away. They exist to provide a clean
boundary between the optimizer and the block compiler, and to enable
debugging the optimizer by being able to turn it off and see if the
specificity based resolution disagrees with the optimized output in the
browser.

#### Block Inheritance and the Resolver

Inheritance sets up a very specific model of resolution where the sub-block
takes precedence over the base-block in any conflict. Since inheritance is
implemented as a multiple class abstraction in the template these look like
conflicts to the template analyzer, which doesn't have any knowledge of what
a block is or what inheritance is. Also, since we can't guarantee the
concatenation order of these two blocks when the CSS is ultimately
delivered, the block compiler detects all style conflicts between the base
and sub blocks and generates an override resolution in the sub-block for
them. However, the inheritance resolution does not override states conflicts,
that must be done by specifying the states in the inherited block.

Specifically for any property that has a conflict with the super block element
of the same value in the key selector the following resolution is created:

```css
@block-reference base from "./base.block.css";
.root { extends: base; }
.foo {
  color: resolve("base.foo");
  color: blue; // conflicts with color value(s) in a selector targeting base.foo
  color: resolve-all("base.foo");
}
```

#### Composing blocks by the consuming app

If a third-party library failed to consider a composition, or if two
third-party libraries don't compose well, the app can provide it's own
composition of the necessary styles as it's own class.

File: `navigation.block.scss`

```scss
@block-reference super-grid-system from "super-grid-system.block.css";
@block-reference drop-down from "drop-down.block.css";

.profile {
  float: --unset;
  float: resolve("super-grid-system.span");

  width: --unset;
  width: resolve("super-grid-system.span", "drop-down.hoverable");

  margin: --unset;
  margin: resolve("drop-down.hoverable", "super-grid-system.span");
}
```

The `--unset` value means that the property won't be set in the output for that ruleset,
but it allows a resolution to be provided. When multiple resolution targets are specified
to the resolve function, the first one wins, but the generated selectors will be created to
resolve all three classes on the same element. This satisfies the optimizer and the silences
the conflict error.

### Debugging a block

Often you may have a reference to a block but aren't sure what block objects
are in its public interface. The `@block-debug` @-rule allows you to
inspect the block's names and also see what classnames they compile to.

You must also tell the debug statement where to output the information.

`@block-debug <block-name> to (comment|stderr|stdout)`

Example:

```css
@block-reference icons from "../../shared/styles/icons/dark.block.css";
@block-debug icons to comment;
```

This might produce something like the following (when in BEM-compatible output mode):

```css
/* Source: shared/styles/icons/dark.block.css
   Extends: shared/styles/icons/base.block.css
   .root => .dark .base
   [state|hoverable] => .base--hoverable
   [state|shade="gray"] => .dark--shade-gray
   [state|shade="red"] => .dark--shade-red
   [state|shade="blue"] => .dark--shade-blue
   .icon => .dark__icon .base__icon
   .new-file => .dark__new-file .base__new-file
   .save-file => .dark__save-file .base__save-file
   .rm-file => .dark__rm-file .base__rm-file */
```

### File Naming

It's convention to name files with a dual extension of `.block.css` (or with
the preprocessor extension of your choosing). This helps identify which CSS
files are blocks and should be processed accordingly. CSS files that are not
processed as blocks should not be optimized with the CSS block optimizer as
it is likely to introduce cascade resolution problems.

It is also convention to use legal CSS identifiers for all aspects of the
file path that may be part of the natural name of the block in your specific
application or framework.

Writing Optimizer-friendly CSS
------------------------------

1. CSS constructs that reduce the optimizer's effectiveness. Optimization
   occurs within an optimization context based on a selector's @-rules, context selector,
   and pseudo selectors. These constructs are often faster than javascript-based
   equivalents, but in aggregate can reduce the overall optimization so use them
   only when necessary.
2. Explicit Resolution on a per-property basis is required for block objects
   from several blocks that are used on the same html element.
   See "Block Composition" below for more details.
3. The tools for CSS Blocks generate a lot of classnames. The strategy that you use
   for this can have a dramatic impact on binary compression algorithms. It is
   recommended that you keep the default settings for class name generation
   except for debugging.
4. It's better to inherit a block to introduce a new static interface option for a
   a block than it is to add a state to it. States are best for runtime behaviors.

Using With Preprocessors
------------------------

Note that people who prefer to use Sass can utilize it's features (or that of other CSS processors) to
change the source authoring. Here's our form example from above written with Sass:

```scss
$base-size: 1em;
.root {
  block-name: my-form;
  margin: 2 * $base-size 0;
  padding: $base-size $base-size / 2;
}

[state|theme=light] {
  color: #333;
}

[state|theme=dark] {
  color: #ccc;
}

[state|compact] {
  margin: $base-size / 2 0;
  padding: $base-size / 2;
}


.input-area {
  display: flex;
  margin: $base-size 0;
  font-size: 1.5rem;
  [state|compact] & {
    margin: $base-size / 4 0;
  }
}

.label {
  flex-basis: 1;
}

.input {
  flex-basis: 3;
  [state|theme=light] & {
    border-color: #333;
  }
  [state|theme=dark] & {
    border-color: #ccc;
  }
}

.submit {
  width: 200px;
  &[state|disabled] {
    color: gray;
  }
}
```

Template Integrations
---------------------

### JSX

Help

### Ember/Glimmer (Handlebars)

Each component has an associated `styles.block.css` file.

The template root element is automatically the block root.

```hbs
<form state:compact state:theme="light">
  <div class="input-area">
    <label class="label">Username</label>
    <input class="input">
  </div>
  <submit class="submit" state:disabled>
</form>
```

Because the output of CSS Blocks is always classnames, templates are
rewritten during the build. Setting `state` attributes at runtime will
have no effect. If in BEM output mode, the above template is re-written to:

```hbs
<form class="my-form--compact my-form--theme-light">
  <div class="my-form__input-area">
    <label class="my-form__label">Username</label>
    <input class="my-form__input">
  </div>
  <submit class="my-form__submit my-form__submit--disabled">
</form>
```

#### Composing styles from several blocks

To use styles from other blocks you must create a block reference in
the current component's styles:

`my-component/styles.block.css`

```css
@block-reference icons from "../../shared/styles/icons/dark.block.css";

.root {
  border: 1px solid black;
  overflow: auto;
}

.icon {
  float: left;
  width: 26px;
  height: 26px;
}
```

`my-component/template.hbs`

```hbs
<div class="icons.root" state:icons.hoverable state:icons.dark>
  <div class="icon icons.new">New File</div>
  <div class="icon icons.save">Save File</div>
  <div class="icon icons.undo">Undo</div>
  <div class="icon icons.print">Print</div>
</div>
```

In BEM output mode this would compile to:

```hbs
<div class="my-component icons icons--hoverable">
  <div class="my-component__icon icons__new" >New File</div>
  <div class="my-component__icon icons__save">Save File</div>
  <div class="my-component__icon icons__undo">Undo</div>
  <div class="my-component__icon icons__print">Print</div>
</div>
```

#### Dynamic styles

In order to return class names dynamically to the template that
reference the styles in the stylesheet, you can import the styles
directly and use the imported component.

The `block-select` helper is what enables you to set block styles
on a template dynamically. Because of the static analysis requirements
of CSS blocks in templates, this helper is a little cumbersome to use.
It takes a helper expression and a list of block object expressions that might be returned
from the helper. The helper should pass calls through one of the following methods:

* `styles.classes(expression: string): Style[]` - Depending on the expression,
  returns the CSS classes for a given state, class, or block. The
  expression takes the form of a block object expression as defined in
  the Syntax section above.

To return the styles of several elements together use the
`cssBlocks.union(...expressions: (string | Style)[]): Style[]` method. This ensures that the
classes returned are correct, de-duplicated, resolved and legal to be used
together, and can still provide hints correctly to the CSS optimizer.


```ts
import Component from "@glimmer/component";
import { cssBlocks } from "css-blocks";
import styles from "./styles.block.css";

export default class MyForm extends Component {
  get isDisabled()
    return true;
  }

  get isCompact()
    return true;
  }

  get username() {
    return "joeschmoe";
  }

  @tracked("@args")
  get themeColor() {
    // raises an error if @currentTheme isn't a state value for theme from the css file.
    return this.args.currentTheme;
  }

  @tracked("isDisabled")
  get submitButtonClass() {
    if (this.isDisabled) {
      return cssBlocks.union(styles.classes('submit'),
                             styles.classes('submit[state|disabled]'));
    } else {
      return styles.classes('submit');
    }
  }
}
```

```hbs
<form state:compact={{isCompact}}>
  <div class="input-area">
    <label class="label" for="username">Username:</label>
    <input type="text" id="username" class="input" value={{username}}>
  </div>
  <div class="input-area">
    <label class="label" for="password">Password:</label>
    <input type="text" id="password" class="input">
  </div>
  <submit class="submit" state:disabled={{isDisabled}} disabled={{isDisabled}}>
  <submit class={{block-select submitButtonClass "submit" "submit[state|disabled]"}}>
</form>
```

Dynamic states get their AST's re-written during template compilation to use
private helpers similar to the block select helper. As noted in the section
"External Selectors" below, any classnames that should be left alone in the
template and not considered part of the current block, must be declared
`@external`.



Media Queries
-------------

TBD how media queries are handled.

Multi-Stage Processing
----------------------

The highly optimized output of CSS Blocks is only possible
because it does its work in three stages:

**Stage 1: Block Compilation.** Each block is compiled down to
 component-oriented CSS classes. Each component's styles are kept in their
 own CSS file.

**Stage 2: Template analysis and rewriting.** Block specific markup is
 rewritten within the templates so that the CSS classes from stage 1 are used
 instead. Analysis is done to understand what CSS classes are used and what
 CSS classes happen to be applied to the same elements. Because there is no
 total ordering of the component CSS files, Errors are generated for style
 conflicts across different block files and must be resolved explicitly.

**Stage 3: Optimization.** The constraints on the authoring of blocks, together with
 the template analysis and explicit resolution scheme, provides a highly
 optimizable framework for combining declarations safely. Unused classes are
 optimized out. A single class from a stylesheet may end up represented by
 as many classes as there are declarations in a ruleset.

**Stage 4: Template Optimization.**
 These final class mappings are then rewritten back into the templates one last time.

 TODO: How to wire each stage into a build system.


Options
-------

* `outputMode`: type `cssBlocks.OutputMode`. Currently defaults to and
  must be `cssBlocks.OutputMode.BEM`. Other output modes will be
  defined soon.
* `interoperableCSS`: type `boolean`. When set to true, an `:exports`
  ruleset is generated providing local names that can be used from JS
  or in other CSS files that are [InteroperableCSS](https://github.com/css-modules/icss) compatible.
  The following names are exported:
  * `block` is exported with the name of the block.
  * State names: the name of the state. E.g. `[state|foo]` is exported
    as `foo`.
  * Exclusive State names: the name of the state group is prefixed to
    the state name with a dash. E.g. `[state|theme=light]` is exported as
    `theme-light`.
  * Class names: The name of the classes. E.g. `.foo` is exported as
    `foo`. Note that these can conflict with state names, it is left to
    the developer to avoid collisions if using interoperable CSS.
  * Class substates: The name of the class is prefixed to the state
    name separated by a double dash. E.g. `.foo[state|visible]` is
    exported as `foo--visible`.

WIP: Detecting Unused Styles
----------------------------

TBD: It should be possible to detect unused styles and prune
from the final build.

WIP: Classname generation schemes
---------------------------------

There are few techniques being considered to compress classes:

0. *No compression*. Outputs standard BEM classes. This is good for when
   porting an existing code base from BEM to CSS Blocks until all
   templates can be updated.
1. *Truncated hashing* (with hash collision detection) - Hashing the BEM
   name is predictable and stable over time. The algorithm used above
   is a base64 encoding with `+` and `/` removed, then selecting 10
   bytes staring with the first non-numeric character. We then need
   to ensure no hash collisions occur across blocks. Hash collisions
   will be rare, but we would pre-allocate a few hundred hashes to be
   used to resolve any any hash collisions we encounter. The collision
   resolution must be stable across builds that do not introduce new
   collisions.
2. *Counter hashing*. Every time we need a new identifier we increment a
   counter. This strategy works fine for within a single block. We don't
   need to ensure cache consistency once a block changes. But we
   must ensure uniqueness across all blocks. To this end, we would need to
   set a maximum number of identifiers in a block so that we can reserve
   higher order bits for counting files themselves in a stable way.
   Addition of new files over time would cause larger than expected cache
   invalidations unless we have a hand maintained file number for each
   block file and even if files are added or removed we would keep the same
   file number for blocks. This process can be automated by a script that
   detects added or removed block files and updates the counters file
   accordingly. In theory, this technique generates smaller output but
   for additional developer complexity.
3. *Localized*. This strategy would keep the local names for a block but
   scope them with a unique identifier to avoid users being able to
   predict the classnames while still preserving some developer
   familiarity when reading the output. This might be best for
   development mode.
4. *Content hashing*. This strategy produces predictable classnames which
   means that developers **could** abuse them if they wanted to.
   However, this approach also means that class names can be de-duplicated
   across files built separately in downstream processing and extracted to
   a shared file. It also means that a custom brotli dictionary could be
   produced that would allow the most common class names to be efficiently
   compressed across templates and CSS files.

Ultimately, the project should support all of these compression
strategies and allow one to be selected via configuration.

[bem]: http://getbem.com/
